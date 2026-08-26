import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';

export type Conn = Pool | PoolConnection;

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME || 'zurb',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true,
      namedPlaceholders: false,
      charset: 'utf8mb4',
      timezone: 'Z',
    });
  }
  return pool;
}

export async function q<T = RowDataPacket>(conn: Conn, sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await conn.query(sql, params);
  return rows as T[];
}

export async function exec(conn: Conn, sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const [res] = await conn.query(sql, params);
  return res as ResultSetHeader;
}

export async function withTx<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    conn.release();
  }
}

export const uuid = () => randomUUID();
