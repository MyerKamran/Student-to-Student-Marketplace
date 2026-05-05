import { Router } from 'express';
import { pool } from '../db.js';
import { requireUser } from '../auth.js';
import { qReviewsForProduct, qReviewSummaryForProduct, qProductOwnerId, qInsertReview } from '../queries/reviews.js';

export function createReviewsRoutes() {
  const router = Router();

  router.get('/products/:id/reviews', async (req, res) => {
    try {
      const productId = Number(req.params.id);
      if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Invalid id' });

      const { rows } = await pool.query(
        qReviewsForProduct(),
        [productId]
      );

      const summaryRes = await pool.query(
        qReviewSummaryForProduct(),
        [productId]
      );
      const summary = summaryRes.rows[0] || { avg_rating: 0, count: 0 };

      res.json({
        summary: { avgRating: Number(summary.avg_rating || 0), count: Number(summary.count || 0) },
        rows: rows.map((r) => ({
          id: r.review_id,
          rating: r.rating,
          comment: r.comment || '',
          createdAt: r.created_at,
          reviewer: {
            id: r.reviewer_id,
            name: r.reviewer_name,
            avatarUrl: r.reviewer_avatar_url,
          },
        })),
      });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.post('/products/:id/reviews', requireUser, async (req, res) => {
    try {
      const productId = Number(req.params.id);
      if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Invalid id' });
      const reviewerId = req.user.user_id;

      const rating = Number(req.body?.rating);
      const comment = String(req.body?.comment || '').trim();
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Invalid rating' });
      if (comment.length > 500) return res.status(400).json({ error: 'Comment too long (max 500 chars)' });

      const ownerRes = await pool.query(qProductOwnerId(), [productId]);
      const sellerId = ownerRes.rows[0]?.seller_id;
      if (!sellerId) return res.status(404).json({ error: 'Product not found' });
      if (Number(sellerId) === Number(reviewerId)) return res.status(400).json({ error: 'You cannot review your own listing' });

      const { rows } = await pool.query(
        qInsertReview(),
        [productId, reviewerId, rating, comment]
      );

      res.status(201).json({ reviewId: rows[0].review_id });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  return router;
}
