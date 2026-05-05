import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { pool } from '../db.js';
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
} from '../queries/users.js';
import {
  normalizeEmail,
  sanitizePassword,
  hashPassword,
  comparePassword,
  signSession,
  getCookieOptions,
  readSession,
  requireUser,
} from '../auth.js';

export function createAuthRoutes() {
  const router = Router();
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

  router.post('/auth/google', async (req, res) => {
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

  router.post('/auth/register', async (req, res) => {
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

  router.post('/auth/login', async (req, res) => {
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

  router.get('/auth/me', async (req, res) => {
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

  router.post('/auth/logout', async (_req, res) => {
    res.clearCookie('session', { path: '/' });
    res.json({ ok: true });
  });

  router.get('/my/profile', requireUser, async (req, res) => {
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

  router.patch('/my/profile', requireUser, async (req, res) => {
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

  return router;
}
