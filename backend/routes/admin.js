import { Router } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../auth.js';
import {
  qAdminOverviewUsersCount,
  qAdminOverviewProductsCount,
  qAdminUsersList,
  qAdminSetUserActive,
  qAdminSoftRemoveUser,
  qAdminDisableProductsBySeller,
  qAdminProductsList,
  qAdminSoftRemoveProduct,
  qAdminDeleteCartItemsForProduct,
} from '../queries/admin.js';

export function createAdminRoutes() {
  const router = Router();

  router.get('/admin/overview', requireAdmin, async (_req, res) => {
    try {
      const [usersRes, productsRes] = await Promise.all([
        pool.query(qAdminOverviewUsersCount()),
        pool.query(qAdminOverviewProductsCount()),
      ]);
      res.json({
        users: Number(usersRes.rows[0]?.count || 0),
        products: Number(productsRes.rows[0]?.count || 0),
      });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.get('/admin/users', requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query(
        qAdminUsersList()
      );
      res.json({
        rows: rows.map((u) => ({
          id: u.user_id,
          name: u.full_name,
          email: u.email,
          campus: u.campus,
          role: u.role,
          isActive: Boolean(u.is_active),
          createdAt: u.created_at,
        })),
      });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.patch('/admin/users/:id/block', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const isActive = Boolean(req.body?.isActive);
      if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });
      if (Number(userId) === Number(req.user.user_id)) return res.status(400).json({ error: 'You cannot block yourself' });

      const { rowCount } = await pool.query(
        qAdminSetUserActive(),
        [userId, isActive]
      );
      if (!rowCount) return res.status(404).json({ error: 'User not found' });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.delete('/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });
      if (Number(userId) === Number(req.user.user_id)) return res.status(400).json({ error: 'You cannot remove yourself' });

      const { rowCount } = await pool.query(
        qAdminSoftRemoveUser(),
        [userId]
      );
      if (!rowCount) return res.status(404).json({ error: 'User not found' });

      await pool.query(
        qAdminDisableProductsBySeller(),
        [userId]
      );

      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.get('/admin/products', requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query(
        qAdminProductsList()
      );
      res.json({
        rows: rows.map((p) => ({
          id: p.product_id,
          title: p.title,
          price: Number(p.price || 0),
          isAvailable: Boolean(p.is_available),
          stockQty: Number(p.stock_qty || 0),
          createdAt: p.created_at,
          seller: {
            id: p.seller_id,
            name: p.seller_name || 'Unknown',
          },
        })),
      });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.delete('/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const productId = Number(req.params.id);
      if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Invalid product id' });
      const { rowCount } = await pool.query(
        qAdminSoftRemoveProduct(),
        [productId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Product not found' });
      await pool.query(qAdminDeleteCartItemsForProduct(), [productId]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  return router;
}
