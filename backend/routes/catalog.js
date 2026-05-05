import { Router } from 'express';
import { pool } from '../db.js';
import { qCategoriesList } from '../queries/categories.js';
import { qPublicProductsList, qPublicProductDetail, qProductImages } from '../queries/publicProducts.js';

function normalizeConditionForUi(dbCondition) {
  const c = String(dbCondition || '').toLowerCase();
  if (c === 'new') return 'New';
  if (c === 'good') return 'Good';
  if (c === 'fair') return 'Fair';
  if (c === 'poor') return 'Poor';
  return 'Good';
}

export function normalizeConditionForDb(uiCondition) {
  const c = String(uiCondition || '').toLowerCase().trim();
  if (c === 'new') return 'new';
  if (c === 'good') return 'good';
  if (c === 'fair') return 'fair';
  if (c === 'poor') return 'poor';
  if (c === 'like new') return 'good';
  return 'good';
}

export function createCatalogRoutes() {
  const router = Router();

  router.get('/categories', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        qCategoriesList()
      );
      res.json({ rows });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.get('/products', async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
      const search = req.query.search ? String(req.query.search) : '';
      const category = req.query.category ? String(req.query.category) : '';
      const condition = req.query.condition ? String(req.query.condition).toLowerCase() : '';
      const sort = req.query.sort ? String(req.query.sort) : 'newest';
      const normalizedCategory = category && category !== 'All' ? category : '';
      const normalizedCondition = condition && condition !== 'all' ? condition : '';
      const normalizedSort = sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest';
      const values = [search, normalizedCategory, normalizedCondition, normalizedSort, limit];

      const { rows } = await pool.query(
        qPublicProductsList(),
        values
      );

      const normalized = rows.map((r) => ({
        id: r.product_id,
        sellerId: r.seller_id,
        title: r.title,
        description: r.description || '',
        price: Number(r.price),
        condition: normalizeConditionForUi(r.condition),
        stockQty: Number(r.stock_qty || 0),
        isOrdered: Boolean(r.is_ordered),
        category: r.category || 'Other',
        sellerName: r.seller_name || 'Unknown',
        sellerEmail: r.seller_email || '',
        sellerPhoneNumber: r.seller_phone_number || '',
        contactPreference: r.contact_preference || 'In-app Message',
        campus: r.campus || 'My Campus',
        date: r.created_at,
        image: r.image_url || 'https://placehold.co/800x600/F3F4F6/9CA3AF?text=No+Image',
      }));

      res.json({ rows: normalized });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  router.get('/products/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

      const detailRes = await pool.query(qPublicProductDetail(), [id]);
      const r = detailRes.rows[0];

      if (!r) return res.status(404).json({ error: 'Not found' });

      const imgsRes = await pool.query(qProductImages(), [id]);
      const images = (imgsRes.rows || []).map((x) => x.image_url).filter(Boolean);
      const primaryImage = images[0] || 'https://placehold.co/800x600/F3F4F6/9CA3AF?text=No+Image';

      res.json({
        row: {
          id: r.product_id,
          sellerId: r.seller_id,
          title: r.title,
          description: r.description || '',
          price: Number(r.price),
          condition: normalizeConditionForUi(r.condition),
          stockQty: Number(r.stock_qty || 0),
          isOrdered: Boolean(r.is_ordered),
          category: r.category || 'Other',
          sellerName: r.seller_name || 'Unknown',
          sellerEmail: r.seller_email || '',
          sellerPhoneNumber: r.seller_phone_number || '',
          contactPreference: r.contact_preference || 'In-app Message',
          campus: r.campus || 'My Campus',
          date: r.created_at,
          image: primaryImage,
          images: images.length ? images : [primaryImage],
        },
      });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  return router;
}
