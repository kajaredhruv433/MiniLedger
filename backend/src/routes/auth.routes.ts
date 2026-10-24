import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db';

export const authRoutes = Router();
const otpStore = new Map<string, { code: string; expiresAt: number }>();
const phoneSchema = z.string().trim().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number');

authRoutes.post('/request-otp', (req, res) => {
  const parsed = phoneSchema.safeParse(req.body?.phone);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const phone = parsed.data;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const ttlMinutes = 5;
  otpStore.set(phone, { code, expiresAt: Date.now() + ttlMinutes * 60_000 });
  console.info(`[MiniLedger] Mock OTP for ${phone}: ${code}`);
  return res.json({ message: 'OTP generated. Check the backend server log.', expiresInMinutes: ttlMinutes });
});

authRoutes.post('/verify-otp', async (req, res, next) => {
  const parsedPhone = phoneSchema.safeParse(req.body?.phone);
  const code = z.string().regex(/^\d{6}$/).safeParse(req.body?.otp);
  if (!parsedPhone.success || !code.success) return res.status(400).json({ error: 'Valid phone and 6-digit OTP are required' });
  const phone = parsedPhone.data;
  const record = otpStore.get(phone);
  if (!record || record.expiresAt <= Date.now() || record.code !== code.data) {
    return res.status(401).json({ error: 'Incorrect or expired OTP' });
  }
  otpStore.delete(phone);
  try {
    const result = await pool.query(
      'INSERT INTO users(phone) VALUES($1) ON CONFLICT(phone) DO UPDATE SET phone = EXCLUDED.phone RETURNING id, phone', [phone]
    );
    const user = result.rows[0];
    const token = jwt.sign({}, process.env.JWT_SECRET || 'dev-only-secret', { subject: String(user.id), expiresIn: '7d' });
    return res.json({ token, user });
  } catch (error) { return next(error); }
});
