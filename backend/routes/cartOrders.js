import { Router } from 'express';
import { pool } from '../db.js';
import { requireUser, isAdminRole } from '../auth.js';
import {
  qCartIdByUser,
  qCartItemsByCartId,
  qProductBasicForCart,
  qIsProductLockedByOpenOrder,
  qUpsertCartItem,
  qUpdateCartItemQty,
  qDeleteCartItem,
  qCheckoutItemsForUpdate,
  qInsertOrder,
  qInsertOrderItem,
  qClearCartItems,
} from '../queries/cart.js';
import { qMyOrdersAsBuyer, qMyOrdersAsSeller } from '../queries/orders.js';

export function createCartOrdersRoutes() {
  const router = Router();

  router.get('/cart', requireUser, async (req, res) => {
    try {
      const userId = req.user.user_id;
      const cartRes = await pool.query(qCartIdByUser(), [userId]);
      const cartId = cartRes.rows[0]?.cart_id;
      if (!cartId) return res.json({ cartId: null, items: [], total: 0 });

      const { rows } = await pool.query(
        qCartItemsByCartId(),
        [cartId]
      );

      const items = rows.map((r) => ({
        cartItemId: r.cart_item_id,
        quantity: r.quantity,
        addedAt: r.added_at,
        product: {
          id: r.product_id,
          title: r.title,
          price: Number(r.price),
          category: r.category || 'Other',
          sellerName: r.seller_name || 'Unknown',
          image: r.image_url || 'https://placehold.co/800x600/F3F4F6/9CA3AF?text=No+Image',
          stockQty: r.stock_qty,
          isAvailable: r.is_available,
        },
        lineTotal: Number(r.price) * Number(r.quantity),
      }));

      const total = items.reduce((sum, it) => sum + it.lineTotal, 0);
      res.json({ cartId, items, total });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.post('/cart/items', requireUser, async (req, res) => {
    try {
      if (isAdminRole(req.user)) return res.status(403).json({ error: 'Admins cannot purchase items' });
      const userId = req.user.user_id;
      const productId = Number(req.body?.productId);
      const quantity = req.body?.quantity === undefined ? 1 : Number(req.body.quantity);
      if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Invalid productId' });
      if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });

      const productRes = await pool.query(
        qProductBasicForCart(),
        [productId]
      );
      const p = productRes.rows[0];
      if (!p) return res.status(404).json({ error: 'Product not found' });
      if (Number(p.seller_id) === Number(userId)) return res.status(400).json({ error: 'You cannot buy your own listing' });
      if (!p.is_available) return res.status(400).json({ error: 'Product is not available' });
      if (Number(p.stock_qty) <= 0) return res.status(400).json({ error: 'Out of stock' });
      const lockRes = await pool.query(
        qIsProductLockedByOpenOrder(),
        [productId]
      );
      if (lockRes.rows[0]) return res.status(400).json({ error: 'Product is currently ordered' });

      const cartRes = await pool.query(qCartIdByUser(), [userId]);
      const cartId = cartRes.rows[0]?.cart_id;
      if (!cartId) return res.status(400).json({ error: 'Cart not found' });

      await pool.query(
        qUpsertCartItem(),
        [cartId, productId, quantity]
      );

      res.status(201).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.patch('/cart/items/:cartItemId', requireUser, async (req, res) => {
    try {
      const userId = req.user.user_id;
      const cartItemId = Number(req.params.cartItemId);
      const quantity = Number(req.body?.quantity);
      if (!Number.isFinite(cartItemId)) return res.status(400).json({ error: 'Invalid cartItemId' });
      if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });

      const cartRes = await pool.query(qCartIdByUser(), [userId]);
      const cartId = cartRes.rows[0]?.cart_id;
      if (!cartId) return res.status(400).json({ error: 'Cart not found' });

      const { rowCount } = await pool.query(
        qUpdateCartItemQty(),
        [quantity, cartItemId, cartId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Item not found' });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.delete('/cart/items/:cartItemId', requireUser, async (req, res) => {
    try {
      const userId = req.user.user_id;
      const cartItemId = Number(req.params.cartItemId);
      if (!Number.isFinite(cartItemId)) return res.status(400).json({ error: 'Invalid cartItemId' });

      const cartRes = await pool.query(qCartIdByUser(), [userId]);
      const cartId = cartRes.rows[0]?.cart_id;
      if (!cartId) return res.status(400).json({ error: 'Cart not found' });

      const { rowCount } = await pool.query(
        qDeleteCartItem(),
        [cartItemId, cartId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Item not found' });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.post('/orders/checkout', requireUser, async (req, res) => {
    if (isAdminRole(req.user)) return res.status(403).json({ error: 'Admins cannot purchase items' });
    const userId = req.user.user_id;
    const client = await pool.connect();
    try {
      await client.query('begin');

      const cartRes = await client.query(qCartIdByUser(), [userId]);
      const cartId = cartRes.rows[0]?.cart_id;
      if (!cartId) return res.status(400).json({ error: 'Cart not found' });

      const itemsRes = await client.query(
        qCheckoutItemsForUpdate(),
        [cartId]
      );

      const items = itemsRes.rows;
      if (items.length === 0) {
        await client.query('rollback');
        return res.status(400).json({ error: 'Cart is empty' });
      }

      for (const it of items) {
        if (!it.is_available) {
          await client.query('rollback');
          return res.status(400).json({ error: `Product ${it.product_id} is not available` });
        }
        if (Number(it.stock_qty) < Number(it.quantity)) {
          await client.query('rollback');
          return res.status(400).json({ error: `Not enough stock for product ${it.product_id}` });
        }
      }

      const totalAmount = items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0);

      const orderRes = await client.query(
        qInsertOrder(),
        [userId, totalAmount]
      );
      const orderId = orderRes.rows[0].order_id;

      for (const it of items) {
        await client.query(
          qInsertOrderItem(),
          [orderId, it.product_id, it.quantity, it.price]
        );
      }

      await client.query(qClearCartItems(), [cartId]);

      await client.query('commit');
      res.status(201).json({ orderId });
    } catch (e) {
      try { await client.query('rollback'); } catch {}
      res.status(500).json({ error: String(e?.message || e) });
    } finally {
      client.release();
    }
  });

  router.get('/my/orders', requireUser, async (req, res) => {
    try {
      const userId = req.user.user_id;
      const [buyerRes, sellerRes] = await Promise.all([
        pool.query(
          qMyOrdersAsBuyer(),
          [userId]
        ),
        pool.query(
          qMyOrdersAsSeller(),
          [userId]
        ),
      ]);

      const rows = [...(buyerRes.rows || []), ...(sellerRes.rows || [])]
        .sort((a, b) => {
          const da = new Date(a.placed_at).getTime();
          const db = new Date(b.placed_at).getTime();
          if (db !== da) return db - da;
          return Number(b.order_id) - Number(a.order_id);
        })
        .slice(0, 200);

      res.json({
        rows: rows.map((r) => ({
          orderId: r.order_id,
          perspective: r.perspective,
          totalAmount: Number(r.total_amount || 0),
          status: r.status,
          orderDate: r.placed_at,
          itemsCount: Number(r.items_count || 0),
          productId: r.product_id,
          counterpart: {
            id: r.counterpart_id,
            name: r.counterpart_name,
          },
        })),
      });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.post('/orders/:id/cancel', requireUser, async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.user.user_id;
      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId)) return res.status(400).json({ error: 'Invalid id' });
      await client.query('begin');

      const orderRes = await client.query(
        `select order_id, buyer_id, status from orders where order_id = $1 limit 1 for update;`,
        [orderId]
      );
      const o = orderRes.rows[0];
      if (!o) {
        await client.query('rollback');
        return res.status(404).json({ error: 'Order not found' });
      }
      if (!['pending', 'confirmed'].includes(String(o.status))) {
        await client.query('rollback');
        return res.status(400).json({ error: 'Order cannot be cancelled' });
      }

      const sellerRes = await client.query(
        `
        select 1
        from order_items oi
        join products p on p.product_id = oi.product_id
        where oi.order_id = $1 and p.seller_id = $2
        limit 1;
        `,
        [orderId, userId]
      );
      const canCancel = Number(o.buyer_id) === Number(userId) || Boolean(sellerRes.rows[0]);
      if (!canCancel) {
        await client.query('rollback');
        return res.status(403).json({ error: 'Forbidden' });
      }

      await client.query(`update orders set status = 'cancelled' where order_id = $1;`, [orderId]);
      await client.query(
        `
        update products p
        set stock_qty = p.stock_qty + oi.quantity,
            is_available = true
        from order_items oi
        where oi.order_id = $1 and oi.product_id = p.product_id;
        `,
        [orderId]
      );

      await client.query('commit');
      res.json({ ok: true });
    } catch (e) {
      try { await client.query('rollback'); } catch {}
      res.status(500).json({ error: String(e?.message || e) });
    } finally {
      client.release();
    }
  });

  router.post('/orders/:id/complete', requireUser, async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.user.user_id;
      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId)) return res.status(400).json({ error: 'Invalid id' });
      await client.query('begin');

      const orderRes = await client.query(
        `select order_id, status from orders where order_id = $1 limit 1 for update;`,
        [orderId]
      );
      const o = orderRes.rows[0];
      if (!o) {
        await client.query('rollback');
        return res.status(404).json({ error: 'Order not found' });
      }
      if (!['pending', 'confirmed'].includes(String(o.status))) {
        await client.query('rollback');
        return res.status(400).json({ error: 'Order cannot be completed' });
      }

      const sellerRes = await client.query(
        `
        select oi.product_id
        from order_items oi
        join products p on p.product_id = oi.product_id
        where oi.order_id = $1 and p.seller_id = $2;
        `,
        [orderId, userId]
      );
      if (sellerRes.rows.length === 0) {
        await client.query('rollback');
        return res.status(403).json({ error: 'Only seller can complete this order' });
      }

      await client.query(
        `
        update products
        set is_available = false, stock_qty = 0
        where product_id = any($1::bigint[]);
        `,
        [sellerRes.rows.map((r) => r.product_id)]
      );
      await client.query(`update orders set status = 'completed' where order_id = $1;`, [orderId]);

      await client.query('commit');
      res.json({ ok: true });
    } catch (e) {
      try { await client.query('rollback'); } catch {}
      res.status(500).json({ error: String(e?.message || e) });
    } finally {
      client.release();
    }
  });

  return router;
}
