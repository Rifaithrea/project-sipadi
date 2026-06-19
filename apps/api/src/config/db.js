import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl
});

export function query(text, params) {
  return pool.query(text, params);
}

export function getClient() {
  return pool.connect();
}
