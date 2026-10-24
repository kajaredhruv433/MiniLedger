import { Pool } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY, phone VARCHAR(20) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS loans (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_name VARCHAR(100) NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      due_date DATE NOT NULL, repaid_at TIMESTAMPTZ,
      direction VARCHAR(10) NOT NULL DEFAULT 'lent' CHECK (direction IN ('lent', 'borrowed')),
      receipt_path TEXT, receipt_asset_id TEXT, receipt_gallery_uri TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE loans ADD COLUMN IF NOT EXISTS direction VARCHAR(10) NOT NULL DEFAULT 'lent';
    ALTER TABLE loans ADD COLUMN IF NOT EXISTS receipt_path TEXT;
    ALTER TABLE loans ADD COLUMN IF NOT EXISTS receipt_asset_id TEXT;
    ALTER TABLE loans ADD COLUMN IF NOT EXISTS receipt_gallery_uri TEXT;
    CREATE INDEX IF NOT EXISTS loans_user_due_idx ON loans(user_id, due_date);
  `);
}
