import { Pool, QueryResult, QueryResultRow } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

export const pool =
  global._pgPool ??
  (global._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }));

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
