import { Pool } from "pg";

let pool;

if (!global._pool) {
  global._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

pool = global._pool;

export default pool;