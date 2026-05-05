import { Router } from 'express';
import { pool } from '../db.js';
import { requireUser, isAdminRole } from '../auth.js';
import { qInsertMessage, qMyMessages, qMarkMessageRead } from '../queries/messages.js';
import { qUnreadMessagesCount, qOpenOrdersCountForUser } from '../queries/notifications.js';

export function createMessagesRoutes() {
  const router = Router();

  router.post('/messages', requireUser, async (req, res) => {
    try {
      if (isAdminRole(req.user)) return res.status(403).json({ error: 'Admins cannot use messages' });
      const senderId = req.user.user_id;
      const receiverId = Number(req.body?.receiverId);
      const productId = req.body?.productId === undefined || req.body?.productId === null ? null : Number(req.body.productId);
      const content = String(req.body?.content || '').trim();

      if (!Number.isFinite(receiverId)) return res.status(400).json({ error: 'Invalid receiverId' });
      if (receiverId === senderId) return res.status(400).json({ error: 'Cannot message yourself' });
      if (!content) return res.status(400).json({ error: 'Message content is required' });
      if (productId !== null && !Number.isFinite(productId)) return res.status(400).json({ error: 'Invalid productId' });

      const { rows } = await pool.query(
        qInsertMessage(),
        [senderId, receiverId, productId, content]
      );

      res.status(201).json({ messageId: rows[0].message_id, sentAt: rows[0].sent_at });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.get('/my/messages', requireUser, async (req, res) => {
    try {
      if (isAdminRole(req.user)) return res.json({ rows: [] });
      const userId = req.user.user_id;
      const { rows } = await pool.query(
        qMyMessages(),
        [userId]
      );

      res.json({ rows });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.post('/my/messages/mark-read', requireUser, async (req, res) => {
    try {
      if (isAdminRole(req.user)) return res.json({ ok: true });
      const userId = req.user.user_id;
      const messageId = Number(req.body?.messageId);
      if (!Number.isFinite(messageId)) return res.status(400).json({ error: 'Invalid messageId' });

      const { rowCount } = await pool.query(
        qMarkMessageRead(),
        [messageId, userId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Message not found' });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.get('/notifications', requireUser, async (req, res) => {
    try {
      if (isAdminRole(req.user)) return res.json({ unreadMessages: 0, openOrders: 0 });
      const userId = req.user.user_id;

      const unreadRes = await pool.query(
        qUnreadMessagesCount(),
        [userId]
      );
      const unreadMessages = unreadRes.rows[0]?.count ?? 0;

      const ordersRes = await pool.query(
        qOpenOrdersCountForUser(),
        [userId]
      );
      const openOrders = ordersRes.rows[0]?.count ?? 0;

      res.json({ unreadMessages, openOrders });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  return router;
}
