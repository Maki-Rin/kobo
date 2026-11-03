import fs from 'fs';
import path from 'path';

export type SqlValue = string | number | null;

export interface Db {
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
}

interface D1QueryResponse<T> {
  success: boolean;
  errors: { message: string }[];
  result: { results: T[] }[];
}

function d1Http(accountId: string, databaseId: string, token: string): Db {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const query = async <T>(sql: string, params: SqlValue[] = []) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json()) as D1QueryResponse<T>;
    if (!response.ok || !body.success) {
      throw new Error(
        `D1 query failed: ${body.errors?.map((e) => e.message).join(', ')}`
      );
    }
    return body.result[0]?.results ?? [];
  };
  return {
    all: query,
    run: async (sql, params) => {
      await query(sql, params);
    },
  };
}

async function localSqlite(file: string): Promise<Db> {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)');
  const applied = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((row) => row.name)
  );
  const hasUsers =
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").all().length > 0;
  const dir = path.join(process.cwd(), 'db/editor/migrations');
  for (const name of fs.readdirSync(dir).sort()) {
    if (applied.has(name)) continue;
    if (!(name.startsWith('0001') && hasUsers)) {
      db.exec(fs.readFileSync(path.join(dir, name), 'utf8'));
    }
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(name);
  }
  return {
    all: async <T>(sql: string, params: SqlValue[] = []) =>
      db.prepare(sql).all(...params) as T[],
    run: async (sql, params = []) => {
      db.prepare(sql).run(...params);
    },
  };
}

let instance: Promise<Db> | null = null;

export function editorDbConfigured(): boolean {
  return Boolean(
    process.env.EDITOR_D1_DATABASE_ID || process.env.EDITOR_SQLITE_PATH
  );
}

export function getDb(): Promise<Db> {
  if (instance) return instance;
  const { CLOUDFLARE_ACCOUNT_ID, EDITOR_D1_DATABASE_ID, EDITOR_D1_API_TOKEN } =
    process.env;
  if (EDITOR_D1_DATABASE_ID) {
    if (!CLOUDFLARE_ACCOUNT_ID || !EDITOR_D1_API_TOKEN) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID と EDITOR_D1_API_TOKEN が必要です');
    }
    instance = Promise.resolve(
      d1Http(CLOUDFLARE_ACCOUNT_ID, EDITOR_D1_DATABASE_ID, EDITOR_D1_API_TOKEN)
    );
  } else if (process.env.EDITOR_SQLITE_PATH) {
    instance = localSqlite(path.resolve(process.env.EDITOR_SQLITE_PATH));
  } else {
    throw new Error('投稿画面のデータベースが設定されていません');
  }
  return instance;
}
