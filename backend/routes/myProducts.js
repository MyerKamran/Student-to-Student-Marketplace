import { Router } from 'express';
import { pool } from '../db.js';
import { requireUser, isAdminRole } from '../auth.js';
import { qMyProducts } from '../queries/products.js';
import { normalizeConditionForDb } from './catalog.js';

function normalizeConditionForUi(dbCondition) {
  const c = String(dbCondition || '').toLowerCase();
  if (c === 'new') return 'New';
  if (c === 'good') return 'Good';
  if (c === 'fair') return 'Fair';
  if (c === 'poor') return 'Poor';
  return 'Good';
}

export function createMyProductsRoutes() {
  const router = Router();

  router.get('/my/products', requireUser, async (req, res) => {
    try {
      const userId = req.user.user_id;
      const { rows } = await pool.query(
        qMyProducts(),
        [userId]
      );

      res.json({
        rows: rows.map((r) => ({
          id: r.product_id,
          title: r.title,
          description: r.description || '',
          price: Number(r.price),
          condition: normalizeConditionForUi(r.condition),
          status: Number(r.sold_qty) > 0
            ? 'sold'
            : (Number(r.open_orders) > 0 ? 'ordered' : 'active'),
          soldQty: Number(r.sold_qty || 0),
          earned: Number(r.earned || 0),
          category: r.category || 'Other',
          sellerName: r.seller_name || 'Unknown',
          campus: r.campus || 'My Campus',
          date: r.created_at,
          image: r.image_url || 'https://placehold.co/800x600/F3F4F6/9CA3AF?text=No+Image',
        })),
      });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.post('/products', requireUser, async (req, res) => {
    try {
      if (isAdminRole(req.user)) return res.status(403).json({ error: 'Admins cannot create listings' });
      const userId = req.user.user_id;
      const {
        title,
        description = '',
        category,
        condition,
        price,
        imageUrl,
        contactPreference,
        campus,
        stockQty,
      } = req.body || {};

      if (!title || String(title).trim().length < 3) return res.status(400).json({ error: 'Title is required' });
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum < 0) return res.status(400).json({ error: 'Invalid price' });

      const qty = stockQty === undefined ? 1 : Number(stockQty);
      if (!Number.isFinite(qty) || qty < 0) return res.status(400).json({ error: 'Invalid stockQty' });

      let categoryId = null;
      if (category && category !== 'All') {
        const cat = await pool.query(`select category_id from categories where name = $1 limit 1;`, [category]);
        categoryId = cat.rows[0]?.category_id ?? null;
      }

      const { rows: inserted } = await pool.query(
        `
        insert into products
          (seller_id, category_id, title, description, price, condition, stock_qty, campus, is_available, contact_preference)
        values
          ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
        returning product_id;
        `,
        [
          userId,
          categoryId,
          String(title).trim(),
          description ? String(description) : '',
          priceNum,
          normalizeConditionForDb(condition),
          qty,
          campus ? String(campus) : null,
          contactPreference ? String(contactPreference) : 'In-app Message',
        ]
      );

      const productId = inserted[0].product_id;

      if (imageUrl && String(imageUrl).trim()) {
        await pool.query(
          `
          insert into product_images (product_id, image_url, is_primary)
          values ($1, $2, true);
          `,
          [productId, String(imageUrl).trim()]
        );
      }

      const { rows } = await pool.query(
        `select product_id as id from products where product_id = $1 limit 1;`,
        [productId]
      );
      res.status(201).json({ row: rows[0] });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.patch('/products/:id', requireUser, async (req, res) => {
    try {
      const userId = req.user.user_id;
      const productId = Number(req.params.id);
      if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Invalid id' });

      const existing = await pool.query(
        `select product_id, seller_id from products where product_id = $1 limit 1;`,
        [productId]
      );
      const row = existing.rows[0];
      if (!row) return res.status(404).json({ error: 'Not found' });
      if (Number(row.seller_id) !== Number(userId)) return res.status(403).json({ error: 'Forbidden' });

      const {
        title,
        description,
        category,
        condition,
        price,
        imageUrl,
        contactPreference,
        campus,
        stockQty,
        isAvailable,
      } = req.body || {};

      let categoryId = undefined;
      if (category !== undefined) {
        if (!category || category === 'All') {
          categoryId = null;
        } else {
          const cat = await pool.query(`select category_id from categories where name = $1 limit 1;`, [String(category)]);
          categoryId = cat.rows[0]?.category_id ?? null;
        }
      }

      const fields = [];
      const values = [];
      function add(fieldSql, value) {
        values.push(value);
        fields.push(`${fieldSql} = $${values.length}`);
      }

      if (title !== undefined) {
        if (!String(title).trim() || String(title).trim().length < 3) return res.status(400).json({ error: 'Invalid title' });
        add('title', String(title).trim());
      }
      if (description !== undefined) add('description', description ? String(description) : '');
      if (category !== undefined) add('category_id', categoryId);
      if (condition !== undefined) add('condition', normalizeConditionForDb(condition));
      if (price !== undefined) {
        const p = Number(price);
        if (!Number.isFinite(p) || p < 0) return res.status(400).json({ error: 'Invalid price' });
        add('price', p);
      }
      if (campus !== undefined) add('campus', campus ? String(campus) : null);
      if (contactPreference !== undefined) add('contact_preference', contactPreference ? String(contactPreference) : 'In-app Message');
      if (stockQty !== undefined) {
        const q = Number(stockQty);
        if (!Number.isFinite(q) || q < 0) return res.status(400).json({ error: 'Invalid stockQty' });
        add('stock_qty', q);
      }
      if (isAvailable !== undefined) add('is_available', Boolean(isAvailable));

      if (fields.length) {
        values.push(productId);
        await pool.query(`update products set ${fields.join(', ')} where product_id = $${values.length};`, values);
      }

      if (imageUrl !== undefined) {
        const img = String(imageUrl || '').trim();
        await pool.query(`delete from product_images where product_id = $1;`, [productId]);
        if (img) {
          await pool.query(
            `insert into product_images (product_id, image_url, is_primary) values ($1, $2, true);`,
            [productId, img]
          );
        }
      }

      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.delete('/products/:id', requireUser, async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.user.user_id;
      const productId = Number(req.params.id);
      if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Invalid id' });

      await client.query('begin');
      const existing = await client.query(
        `select product_id, seller_id from products where product_id = $1 limit 1 for update;`,
        [productId]
      );
      const row = existing.rows[0];
      if (!row) {
        await client.query('rollback');
        return res.status(404).json({ error: 'Not found' });
      }
      if (Number(row.seller_id) !== Number(userId)) {
        await client.query('rollback');
        return res.status(403).json({ error: 'Forbidden' });
      }

      await client.query(
        `update products set is_available = false, stock_qty = 0 where product_id = $1;`,
        [productId]
      );
      await client.query(`delete from cart_items where product_id = $1;`, [productId]);

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
