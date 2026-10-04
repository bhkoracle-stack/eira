const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL || "";
const connectionString = databaseUrl
  .replace(/([?&])channel_binding=[^&]*&/, "$1")
  .replace(/[?&]channel_binding=[^&]*$/, "");
const pool = new Pool({
  connectionString,
  ssl: databaseUrl.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  await pool.query(`
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_path TEXT;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS max_distance_km INTEGER NOT NULL DEFAULT 50;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
    ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets (user_id, created_at DESC);
  `);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (status IN ('open', 'reviewed'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE support_requests ADD CONSTRAINT support_requests_status_check CHECK (status IN ('open', 'closed'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = { pool, migrate, httpError };
