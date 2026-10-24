import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import multer from 'multer';
import { authRoutes } from './routes/auth.routes';
import { loanRoutes } from './routes/loans.routes';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Receipt image must be 3 MB or smaller.' : 'Could not upload receipt image.';
    return res.status(400).json({ error: message });
  }
  if (error instanceof Error && error.message === 'Only JPEG, PNG, and WebP receipt images are supported.') {
    return res.status(400).json({ error: error.message });
  }
  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
});
