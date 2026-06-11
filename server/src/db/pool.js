import pg from 'pg';

/** Env is loaded by `server/bootstrap-env.js` before routes import this module. */
const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL?.trim();

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || undefined,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: false,
    });

if (!databaseUrl) {
  console.log('Connecting as:', process.env.DB_USER);
}

pool.on('error', (err) => {
  console.error('[pg pool] Unexpected error on idle client:', err);
});

export default pool;