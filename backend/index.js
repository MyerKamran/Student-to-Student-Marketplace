import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { pool } from './db.js';
import { qMyProducts } from './queries/products.js';
import { qMyOrdersAsBuyer, qMyOrdersAsSeller } from './queries/orders.js';
import {
  qUserByEmailForGoogle,
  qInsertGoogleUser,
  qUpdateGoogleUserWithPassword,
  qUpdateGoogleUserNoPassword,
  qEnsureCartForUser,
  qRegisterUser,
  qLoginUserByEmail,
  qAuthMeUser,
  qMyProfile,
  qUpdateMyProfile,
} from './queries/users.js';
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
} from './queries/admin.js';
import { qCategoriesList } from './queries/categories.js';
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
} from './queries/cart.js';
import { qInsertMessage, qMyMessages, qMarkMessageRead } from './queries/messages.js';
import { qUnreadMessagesCount, qOpenOrdersCountForUser } from './queries/notifications.js';
import { qReviewsForProduct, qReviewSummaryForProduct, qProductOwnerId, qUpsertReview } from './queries/reviews.js';
import { qPublicProductsList, qPublicProductDetail, qProductImages } from './queries/publicProducts.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;
const jwtSecret = process.env.JWT_SECRET || '';

async function ensureOptionalColumns() {
  await pool.query(`
    alter table users add column if not exists occupation text default 'Student';
    alter table users add column if not exists phone_number text;
    alter table users add column if not exists bio text;
    alter table users add column if not exists password text;
    alter table users alter column password type text using password::text;
    alter table products add column if not exists contact_preference text default 'In-app Message';
  `);

  await pool.query(`
    create or replace view product_order_stats as
    select
      oi.product_id,
      sum(oi.quantity) filter (where o.status in ('pending','confirmed','completed')) as sold_qty,
      sum(oi.quantity * oi.unit_price) filter (where o.status in ('pending','confirmed','completed')) as earned,
      count(*) filter (where o.status in ('pending','confirmed')) as open_orders
    from order_items oi
    join orders o on o.order_id = oi.order_id
    group by oi.product_id;
  `);

  await pool.query(`
    create or replace view product_primary_images as
    select distinct on (pi.product_id)
      pi.product_id,
      pi.image_url
    from product_images pi
    order by pi.product_id, pi.is_primary desc, pi.image_id asc;
  `);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sanitizePassword(password) {
  return String(password || '');
}

async function hashPassword(password) {
  const plain = sanitizePassword(password);
  if (plain.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  return bcrypt.hash(plain, 10);
}

async function comparePassword(plain, hash) {
  if (!hash) return false;
  const cleanPlain = sanitizePassword(plain);
  const cleanHash = String(hash);
  if (cleanHash.startsWith('$2a$') || cleanHash.startsWith('$2b$') || cleanHash.startsWith('$2y$')) {
    return bcrypt.compare(cleanPlain, cleanHash);
  }
  return cleanPlain === cleanHash;
}

function getCookieOptions() {
  const secure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function signSession(payload) {
  if (!jwtSecret) throw new Error('Missing JWT_SECRET');
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

function readSession(req) {
  const token = req.cookies?.session;
  if (!token) return null;
  if (!jwtSecret) return null;
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

async function loadSessionUser(req) {
  const session = readSession(req);
  if (!session?.user_id) return null;
  const { rows } = await pool.query(
    `
    select user_id, email, role, is_active
    from users
    where user_id = $1
    limit 1;
    `,
    [session.user_id]
  );
  const u = rows[0];
  if (!u || !u.is_active) return null;
  return {
    user_id: u.user_id,
    email: u.email,
    role: u.role,
  };
}

async function requireUser(req, res, next) {
  try {
    const sessionUser = await loadSessionUser(req);
    if (!sessionUser?.user_id) return res.status(401).json({ error: 'Not authenticated' });
    req.user = sessionUser;
    next();
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const sessionUser = await loadSessionUser(req);
    if (!sessionUser?.user_id) return res.status(401).json({ error: 'Not authenticated' });
    if (String(sessionUser.role || '').toLowerCase() !== 'admin') return res.status(403).json({ error: 'Admin only' });
    req.user = sessionUser;
    next();
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}

function isAdminRole(user) {
  return String(user?.role || '').toLowerCase() === 'admin';
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('select 1 as ok;');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    if (!googleClient || !googleClientId) return res.status(500).json({ error: 'Missing GOOGLE_CLIENT_ID' });
    const idToken = req.body?.idToken;
    if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email) return res.status(400).json({ error: 'Google token missing email' });

    const googleId = payload?.sub || null;
    const fullName = payload?.name || email.split('@')[0];
    const avatarUrl = payload?.picture || null;

    const normalizedEmail = normalizeEmail(email);
    const existing = await pool.query(
      qUserByEmailForGoogle(),
      [normalizedEmail]
    );
    const existingUser = existing.rows[0];
    let user = null;

    if (existingUser && !existingUser.is_active) {
      return res.status(403).json({ error: 'This account is blocked.' });
    }

    if (!existingUser) {
      const { rows } = await pool.query(
        qInsertGoogleUser(),
        [fullName, normalizedEmail, googleId, avatarUrl]
      );
      user = rows[0];
      return res.status(200).json({
        requiresPasswordSetup: true,
        email: normalizedEmail,
        suggestedName: fullName,
      });
    }

    const hasPassword = Boolean(existingUser.password_value);
    if (!hasPassword) {
      const newPassword = sanitizePassword(req.body?.password);
      if (newPassword.length < 6) {
        return res.status(200).json({
          requiresPasswordSetup: true,
          email: normalizedEmail,
          suggestedName: existingUser.full_name || fullName,
        });
      }

      const passwordHash = await hashPassword(newPassword);
      const { rows } = await pool.query(
        qUpdateGoogleUserWithPassword(),
        [existingUser.user_id, fullName, googleId, avatarUrl, passwordHash]
      );
      user = rows[0];
    } else {
      const { rows } = await pool.query(
        qUpdateGoogleUserNoPassword(),
        [existingUser.user_id, fullName, googleId, avatarUrl]
      );
      user = rows[0];
    }

    // If user already existed before trigger was created, ensure cart exists.
    await pool.query(
      qEnsureCartForUser(),
      [user.user_id]
    );

    const token = signSession({ user_id: user.user_id, email: user.email, role: user.role });
    res.cookie('session', token, getCookieOptions());

    res.json({
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        campus: user.campus,
        avatarUrl: user.avatar_url,
        role: user.role,
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const fullName = String(req.body?.name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = sanitizePassword(req.body?.password);
    const campus = req.body?.campus ? String(req.body.campus).trim() : null;

    if (fullName.length < 2) return res.status(400).json({ error: 'Name is required' });
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email is required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      qRegisterUser(),
      [fullName, email, passwordHash, campus]
    );
    if (!rows[0]) return res.status(409).json({ error: 'Email is already registered' });
    const user = rows[0];

    await pool.query(
      qEnsureCartForUser(),
      [user.user_id]
    );

    const token = signSession({ user_id: user.user_id, email: user.email, role: user.role });
    res.cookie('session', token, getCookieOptions());
    res.status(201).json({
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        campus: user.campus,
        avatarUrl: user.avatar_url,
        role: user.role,
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = sanitizePassword(req.body?.password);
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const { rows } = await pool.query(
      qLoginUserByEmail(),
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.is_active) return res.status(403).json({ error: 'This account is blocked.' });
    const ok = await comparePassword(password, user.password_value);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signSession({ user_id: user.user_id, email: user.email, role: user.role });
    res.cookie('session', token, getCookieOptions());
    res.json({
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        campus: user.campus,
        avatarUrl: user.avatar_url,
        role: user.role,
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const session = readSession(req);
    if (!session?.user_id) return res.json({ user: null });
    const { rows } = await pool.query(
      qAuthMeUser(),
      [session.user_id]
    );
    if (!rows[0] || !rows[0].is_active) return res.json({ user: null });
    const u = rows[0];
    res.json({
      user: {
        id: u.user_id,
        name: u.full_name,
        email: u.email,
        campus: u.campus,
        avatarUrl: u.avatar_url,
        role: u.role,
        occupation: u.occupation || 'Student',
        phoneNumber: u.phone_number || null,
        bio: u.bio || null,
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/auth/logout', async (_req, res) => {
  res.clearCookie('session', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/my/profile', requireUser, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { rows } = await pool.query(
      qMyProfile(),
      [userId]
    );
    const u = rows[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({
      row: {
        id: u.user_id,
        name: u.full_name,
        email: u.email,
        campus: u.campus,
        avatarUrl: u.avatar_url,
        role: u.role,
        occupation: u.occupation || 'Student',
        phoneNumber: u.phone_number || '',
        bio: u.bio || '',
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.patch('/api/my/profile', requireUser, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const {
      name,
      campus,
      occupation,
      phoneNumber,
      bio,
      avatarUrl,
    } = req.body || {};
    const { rows } = await pool.query(
      qUpdateMyProfile(),
      [
        userId,
        name ? String(name).trim() : null,
        campus ? String(campus).trim() : null,
        occupation ? String(occupation).trim() : null,
        phoneNumber ? String(phoneNumber).trim() : null,
        bio ? String(bio).trim() : '',
        avatarUrl ? String(avatarUrl).trim() : null,
      ]
    );
    const u = rows[0];
    res.json({
      user: {
        id: u.user_id,
        name: u.full_name,
        email: u.email,
        campus: u.campus,
        avatarUrl: u.avatar_url,
        role: u.role,
        occupation: u.occupation || 'Student',
        phoneNumber: u.phone_number || '',
        bio: u.bio || '',
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ────────────────────────────────────────────────
// ADMIN
// ────────────────────────────────────────────────
app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
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

app.get('/api/admin/users', requireAdmin, async (_req, res) => {
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

app.patch('/api/admin/users/:id/block', requireAdmin, async (req, res) => {
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

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
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

app.get('/api/admin/products', requireAdmin, async (_req, res) => {
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

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
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

app.get('/api/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      qCategoriesList()
    );
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

function normalizeConditionForUi(dbCondition) {
  const c = String(dbCondition || '').toLowerCase();
  if (c === 'new') return 'New';
  if (c === 'good') return 'Good';
  if (c === 'fair') return 'Fair';
  if (c === 'poor') return 'Poor';
  return 'Good';
}

function normalizeConditionForDb(uiCondition) {
  const c = String(uiCondition || '').toLowerCase().trim();
  if (c === 'new') return 'new';
  if (c === 'good') return 'good';
  if (c === 'fair') return 'fair';
  if (c === 'poor') return 'poor';
  if (c === 'like new') return 'good';
  return 'good';
}

app.get('/api/products', async (req, res) => {
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

app.get('/api/products/:id', async (req, res) => {
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

app.get('/api/my/products', requireUser, async (req, res) => {
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

app.post('/api/products', requireUser, async (req, res) => {
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

app.patch('/api/products/:id', requireUser, async (req, res) => {
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

app.delete('/api/products/:id', requireUser, async (req, res) => {
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

    // "Soft delete" so old orders/messages can still reference it safely.
    await client.query(
      `update products set is_available = false, stock_qty = 0 where product_id = $1;`,
      [productId]
    );
    await client.query(`delete from cart_items where product_id = $1;`, [productId]);

    await client.query('commit');
    res.json({ ok: true });
  } catch (e) {
    try { await client.query('rollback'); } catch { /* ignore */ }
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    client.release();
  }
});

// ────────────────────────────────────────────────
// CART + CHECKOUT
// ────────────────────────────────────────────────
app.get('/api/cart', requireUser, async (req, res) => {
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

app.post('/api/cart/items', requireUser, async (req, res) => {
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

app.patch('/api/cart/items/:cartItemId', requireUser, async (req, res) => {
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

app.delete('/api/cart/items/:cartItemId', requireUser, async (req, res) => {
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

app.post('/api/orders/checkout', requireUser, async (req, res) => {
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
      // Stock reduction happens via trigger trg_reduce_stock AFTER INSERT on order_items.
    }

    await client.query(qClearCartItems(), [cartId]);

    await client.query('commit');
    res.status(201).json({ orderId });
  } catch (e) {
    try { await client.query('rollback'); } catch { /* ignore */ }
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    client.release();
  }
});

app.get('/api/my/orders', requireUser, async (req, res) => {
  try {
    const userId = req.user.user_id;
    // Keep SQL small: run two simple queries and merge/sort in JS.
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

app.post('/api/orders/:id/cancel', requireUser, async (req, res) => {
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
    try { await client.query('rollback'); } catch { /* ignore */ }
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    client.release();
  }
});

app.post('/api/orders/:id/complete', requireUser, async (req, res) => {
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
    try { await client.query('rollback'); } catch { /* ignore */ }
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    client.release();
  }
});

// ────────────────────────────────────────────────
// MESSAGES + NOTIFICATIONS
// ────────────────────────────────────────────────
app.post('/api/messages', requireUser, async (req, res) => {
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

app.get('/api/my/messages', requireUser, async (req, res) => {
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

app.post('/api/my/messages/mark-read', requireUser, async (req, res) => {
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

app.get('/api/notifications', requireUser, async (req, res) => {
  try {
    if (isAdminRole(req.user)) return res.json({ unreadMessages: 0, openOrders: 0 });
    const userId = req.user.user_id;

    const unreadRes = await pool.query(
      qUnreadMessagesCount(),
      [userId]
    );
    const unreadMessages = unreadRes.rows[0]?.count ?? 0;

    // Count open orders as buyer or seller.
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

// ────────────────────────────────────────────────
// REVIEWS 
// ────────────────────────────────────────────────
app.get('/api/products/:id/reviews', async (req, res) => {
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

app.post('/api/products/:id/reviews', requireUser, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Invalid id' });
    const reviewerId = req.user.user_id;

    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || '').trim();
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Invalid rating' });
    if (comment.length > 500) return res.status(400).json({ error: 'Comment too long (max 500 chars)' });

    // Prevent reviewing your own product
    const ownerRes = await pool.query(qProductOwnerId(), [productId]);
    const sellerId = ownerRes.rows[0]?.seller_id;
    if (!sellerId) return res.status(404).json({ error: 'Product not found' });
    if (Number(sellerId) === Number(reviewerId)) return res.status(400).json({ error: 'You cannot review your own listing' });

    const { rows } = await pool.query(
      qUpsertReview(),
      [productId, reviewerId, rating, comment]
    );

    res.status(201).json({ reviewId: rows[0].review_id });
  } catch (e) {
    // If reviews table doesn't exist yet, the error will guide the user to run the migration.
    res.status(500).json({ error: String(e?.message || e) });
  }
});

const port = Number(process.env.PORT) || 8787;
if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('Missing DATABASE_URL. Create a .env file (copy from .env.example).');
}
if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('Missing JWT_SECRET. Add it to .env');
}
if (!process.env.GOOGLE_CLIENT_ID) {
  // eslint-disable-next-line no-console
  console.warn('Missing GOOGLE_CLIENT_ID. Add it to .env');
}

await ensureOptionalColumns();

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});

server.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('API server error:', err);
});

// In some Windows/IDE shells, the process can exit unexpectedly even after listen().
// Keeping stdin open is a simple, low-risk way to ensure the dev server stays alive.
process.stdin.resume();

