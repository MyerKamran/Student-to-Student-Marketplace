import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const jwtSecret = process.env.JWT_SECRET || '';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function sanitizePassword(password) {
  return String(password || '');
}

export async function hashPassword(password) {
  const plain = sanitizePassword(password);
  if (plain.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain, hash) {
  if (!hash) return false;
  const cleanPlain = sanitizePassword(plain);
  const cleanHash = String(hash);
  if (cleanHash.startsWith('$2a$') || cleanHash.startsWith('$2b$') || cleanHash.startsWith('$2y$')) {
    return bcrypt.compare(cleanPlain, cleanHash);
  }
  return cleanPlain === cleanHash;
}

export function getCookieOptions() {
  const secure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function signSession(payload) {
  if (!jwtSecret) throw new Error('Missing JWT_SECRET');
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

export function readSession(req) {
  const token = req.cookies?.session;
  if (!token) return null;
  if (!jwtSecret) return null;
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

export async function loadSessionUser(req) {
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

export async function requireUser(req, res, next) {
  try {
    const sessionUser = await loadSessionUser(req);
    if (!sessionUser?.user_id) return res.status(401).json({ error: 'Not authenticated' });
    req.user = sessionUser;
    next();
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}

export async function requireAdmin(req, res, next) {
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

export function isAdminRole(user) {
  return String(user?.role || '').toLowerCase() === 'admin';
}
