import 'dotenv/config';
import { app } from './app';
import { initializeDatabase, pool } from './db';

const port = Number(process.env.PORT || 4000);
initializeDatabase().then(() => {
  app.listen(port, '0.0.0.0', () => console.info(`MiniLedger API listening on port ${port} (all network interfaces)`));
}).catch((error) => {
  console.error('Could not initialize PostgreSQL. Check DATABASE_URL and ensure PostgreSQL is running.', error);
  process.exit(1);
});

process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
