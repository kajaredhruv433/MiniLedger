import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../db';
import { AuthRequest, requireAuth } from '../middleware/auth';

export const loanRoutes = Router();
loanRoutes.use(requireAuth);
const uploadDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const allowedTypes: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${allowedTypes[file.mimetype] || '.jpg'}`)
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => allowedTypes[file.mimetype]
    ? callback(null, true)
    : callback(new Error('Only JPEG, PNG, and WebP receipt images are supported.'))
});

const loanSchema = z.object({
  friendName: z.string().trim().min(1, 'Friend name is required').max(100),
  amount: z.coerce.number().positive('Amount must be greater than ₹0').finite().max(9999999999.99),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date is required (YYYY-MM-DD)').refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, 'Enter a valid date (YYYY-MM-DD)'),
  direction: z.enum(['lent', 'borrowed']).default('lent'),
  receiptAssetId: z.string().max(500).optional().nullable(),
  receiptGalleryUri: z.string().max(2000).optional().nullable()
});
const returningColumns = `id, friend_name AS "friendName", amount::float AS amount,
  to_char(due_date, 'YYYY-MM-DD') AS "dueDate", repaid_at AS "repaidAt",
  direction, receipt_path AS "receiptPath", receipt_asset_id AS "receiptAssetId",
  receipt_gallery_uri AS "receiptGalleryUri", created_at AS "createdAt"`;

loanRoutes.get('/', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(`SELECT ${returningColumns} FROM loans WHERE user_id = $1 ORDER BY due_date ASC, created_at DESC`, [req.userId]);
    return res.json({ loans: result.rows });
  } catch (error) { return next(error); }
});

loanRoutes.post('/', upload.single('receipt'), async (req: AuthRequest, res, next) => {
  const parsed = loanSchema.safeParse(req.body);
  if (!parsed.success) {
    if (req.file) fs.unlink(req.file.path, () => undefined);
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  try {
    const { friendName, amount, dueDate, direction, receiptAssetId, receiptGalleryUri } = parsed.data;
    const receiptPath = req.file ? `/uploads/${path.basename(req.file.path)}` : null;
    const result = await pool.query(
      `INSERT INTO loans(user_id, friend_name, amount, due_date, direction, receipt_path, receipt_asset_id, receipt_gallery_uri)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${returningColumns}`,
      [req.userId, friendName, amount, dueDate, direction, receiptPath, receiptPath ? receiptAssetId || null : null, receiptPath ? receiptGalleryUri || null : null]
    );
    return res.status(201).json({ loan: result.rows[0] });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => undefined);
    return next(error);
  }
});

loanRoutes.patch('/:id/repaid', async (req: AuthRequest, res, next) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid loan id' });
  try {
    const result = await pool.query(
      `UPDATE loans SET repaid_at = NOW() WHERE id = $1 AND user_id = $2 AND repaid_at IS NULL RETURNING ${returningColumns}`,
      [id, req.userId]
    );
    if (!result.rowCount) {
      const existing = await pool.query('SELECT repaid_at FROM loans WHERE id = $1 AND user_id = $2', [id, req.userId]);
      if (!existing.rowCount) return res.status(404).json({ error: 'Loan not found' });
      return res.status(409).json({ error: 'This loan is already marked as settled.' });
    }
    return res.json({ loan: result.rows[0] });
  } catch (error) { return next(error); }
});

loanRoutes.delete('/:id', async (req: AuthRequest, res, next) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid loan id' });
  try {
    const result = await pool.query(`DELETE FROM loans WHERE id = $1 AND user_id = $2 RETURNING receipt_path`, [id, req.userId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Loan not found' });
    const receiptPath = result.rows[0]?.receipt_path as string | null;
    if (receiptPath) fs.unlink(path.join(uploadDir, path.basename(receiptPath)), () => undefined);
    return res.json({ success: true });
  } catch (error) { return next(error); }
});

loanRoutes.get('/summary', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
       COALESCE(SUM(amount) FILTER (WHERE direction = 'lent'), 0)::float AS "totalLent",
       COALESCE(SUM(amount) FILTER (WHERE direction = 'lent' AND repaid_at IS NOT NULL), 0)::float AS "totalRepaid",
       COALESCE(SUM(amount) FILTER (WHERE direction = 'borrowed'), 0)::float AS "totalBorrowed",
       COALESCE(SUM(amount) FILTER (WHERE direction = 'borrowed' AND repaid_at IS NOT NULL), 0)::float AS "totalPaid",
       COALESCE(SUM(amount) FILTER (WHERE direction = 'lent' AND repaid_at IS NULL), 0)::float AS "toCollect",
       COALESCE(SUM(amount) FILTER (WHERE direction = 'borrowed' AND repaid_at IS NULL), 0)::float AS "toRepay",
       COALESCE(SUM(amount) FILTER (WHERE direction = 'lent' AND repaid_at IS NULL AND due_date < CURRENT_DATE), 0)::float AS "overdueAmount",
       COALESCE(SUM(amount) FILTER (WHERE direction = 'borrowed' AND repaid_at IS NULL AND due_date < CURRENT_DATE), 0)::float AS "overdueToRepay"
       FROM loans WHERE user_id = $1`, [req.userId]
    );
    return res.json({ summary: result.rows[0] });
  } catch (error) { return next(error); }
});
