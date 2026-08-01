import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Neon's HTTP driver executes exactly one statement per call (unlike a real
// TCP connection, it can't run a `;`-separated batch) -- so unlike the old
// SQLite SCHEMA_SQL (one big db.exec() string), this is an ordered array of
// individual statements, applied one at a time. Order matters: a table must
// exist before another table's FK can reference it.
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  // Accounts created via Google/GitHub login have no password at all --
  // nullable so `createOAuthUser` (lib/auth/queries.ts) can leave it unset
  // instead of inventing a fake hash nobody could ever log in with anyway.
  `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,
  `CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    run_group_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    system_prompt TEXT,
    user_prompt TEXT NOT NULL,
    temperature DOUBLE PRECISION,
    status TEXT NOT NULL,
    response_text TEXT,
    error_message TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    latency_ms INTEGER,
    duration_ms INTEGER,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    project_id INTEGER REFERENCES projects(id),
    effort TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at)`,
  `CREATE INDEX IF NOT EXISTS idx_runs_provider ON runs(provider)`,
  `CREATE INDEX IF NOT EXISTS idx_runs_group ON runs(run_group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id)`,
  `CREATE TABLE IF NOT EXISTS judge_runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    run_group_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    judge_provider TEXT NOT NULL,
    judge_model TEXT NOT NULL,
    result_text TEXT,
    error_message TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    winner_provider TEXT,
    winner_model TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    source_run_id INTEGER REFERENCES runs(id),
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS memory_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    trigger_type TEXT NOT NULL DEFAULT 'manual',
    interval_minutes INTEGER,
    last_run_at TEXT,
    created_at TEXT NOT NULL,
    output_type TEXT NOT NULL DEFAULT 'text',
    filename TEXT,
    category TEXT NOT NULL DEFAULT 'custom'
  )`,
  // "path" holds a Vercel Blob URL, not a local filesystem path -- kept the
  // same column/field name as the pre-Blob-migration SQLite schema so
  // lib/files/queries.ts's FileRow shape (and its callers) didn't need renaming.
  `CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'run_complete',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,
  // Bearer session tokens (see lib/auth/session.ts) -- the token itself is the
  // 256-bit random secret, so the row IS the credential; no extra encryption
  // layer on top (that's an optional hardening the Next.js auth guide notes,
  // not a requirement -- see node_modules/next/dist/docs/.../authentication.md).
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  // Unlike sessions, this stores a hash (not the raw value) -- the raw
  // 6-digit code only ever exists inside the emailed message.
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    code_hash TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  )`,
  // Signup doesn't issue a session directly (see app/api/auth/signup) -- an
  // account only becomes usable after its emailed code is confirmed via
  // /api/auth/verify-email.
  `CREATE TABLE IF NOT EXISTS email_verification_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_codes(user_id)`,
  // Links a users row to a Google/GitHub identity. One user can hold both --
  // signing in with a second provider under the same (verified) email just
  // adds a second row here instead of creating a duplicate account.
  `CREATE TABLE IF NOT EXISTS oauth_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (provider, provider_user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id)`,
  // Replaces the old per-user ~/.ai-command-center/users/<id>/config.json file
  // (provider keys/OAuth tokens/budget/preferences) -- see lib/config/keysStore.ts.
  // The secret fields inside `config` are encrypted by lib/config/crypto.ts
  // before this column ever sees them; Postgres itself doesn't know or care.
  `CREATE TABLE IF NOT EXISTS user_configs (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    config JSONB NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  // AI Committee Engine: run -> loop -> stage-call, one level deeper than
  // runs/judge_runs. Unlike runs (insert-only-at-completion), a committee run
  // is inserted at start (status='running') and updated incrementally as
  // loops/stage-calls complete, so a crash mid-run still leaves real partial
  // history instead of nothing.
  `CREATE TABLE IF NOT EXISTS committee_runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    mission TEXT NOT NULL,
    optimized_mission TEXT,
    context_json TEXT NOT NULL,
    providers_json TEXT NOT NULL,
    target_quality_score INTEGER NOT NULL,
    max_loops INTEGER NOT NULL,
    judge_provider TEXT NOT NULL,
    judge_model TEXT NOT NULL,
    estimated_cost_usd DOUBLE PRECISION NOT NULL,
    estimated_seconds INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    final_consensus_text TEXT,
    final_quality_score INTEGER,
    best_loop_number INTEGER,
    total_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_committee_runs_user ON committee_runs(user_id)`,
  `CREATE TABLE IF NOT EXISTS committee_loops (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    committee_run_id INTEGER NOT NULL REFERENCES committee_runs(id),
    loop_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    consensus_text TEXT,
    quality_score INTEGER,
    quality_score_raw TEXT,
    participating_providers_json TEXT NOT NULL,
    excluded_providers_json TEXT NOT NULL,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_committee_loops_run ON committee_loops(committee_run_id)`,
  // response_text is kept in full for every stage call (not just the final
  // per-loop consensus) -- this app has never discarded LLM response text
  // anywhere else (runs.response_text keeps everything), and it's the only
  // way to later answer "why did loop 3 score lower than loop 2."
  `CREATE TABLE IF NOT EXISTS committee_stage_calls (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    committee_run_id INTEGER NOT NULL REFERENCES committee_runs(id),
    loop_number INTEGER NOT NULL,
    stage TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL,
    response_text TEXT,
    error_message TEXT,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_committee_stage_calls_run ON committee_stage_calls(committee_run_id)`,
];

let sqlClient: NeonQueryFunction<false, true> | null = null;
let schemaReady: Promise<void> | null = null;

function rawSql(): NeonQueryFunction<false, true> {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set -- required to reach the Neon Postgres database.");
    }
    // fullResults: true -- without it, .query() returns just the row array
    // (rowCount included by default only for the query-object result shape).
    sqlClient = neon(url, { fullResults: true });
  }
  return sqlClient;
}

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = rawSql();
      for (const statement of SCHEMA_STATEMENTS) {
        await sql.query(statement);
      }
    })();
  }
  return schemaReady;
}

/** `?` placeholders (kept from the SQLite-era call sites) -> Postgres's positional `$1, $2, ...`. */
function toPositionalSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function run<T = Record<string, unknown>>(sql: string, params: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
  await ensureSchema();
  const result = await rawSql().query(toPositionalSql(sql), params);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

export async function queryAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await run<T>(sql, params)).rows;
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: unknown[] = []): Promise<{ rowCount: number }> {
  const { rowCount } = await run(sql, params);
  return { rowCount };
}
