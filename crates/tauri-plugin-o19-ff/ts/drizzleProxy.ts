import { invoke } from "@tauri-apps/api/core";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "@o19/foundframe-front-drizzle/schema";

type Row = {
  columns: string[];
  values: string[];
};

// FIXME add dbname to run_sql
export function createDrizzleProxy(dbName: string) {
  try {
    const db = drizzle(
      async (sql, params, method) => {
        try {
          const rows = await invoke<Row[]>("plugin:o19-ff|run_sql", {
            query: { sql, params }
          });
          if (rows.length === 0 && method === "get") {
            /**
             * 🛠 Workaround for Drizzle ORM SQLite Proxy `.get()` bug
             *
             * `.get()` with no results throws due to Drizzle trying to destructure `undefined`.
             * See: https://github.com/drizzle-team/drizzle-orm/issues/4113
             *
             * Until fixed upstream, we return `{}` when rows are empty to avoid crashes.
             */
            return {} as { rows: string[] };
          }
          return method === "get"
            ? { rows: rows[0].values }
            : { rows: rows.map((r) => r.values) };
        } catch (e: unknown) {
          console.error("Error from sqlite proxy server: ", e);
          return { rows: [] };
        }
      },
      {
        schema,
        logger: true
      }
    );

    if (!db) {
      throw new Error("Drizzle proxy not created");
    }
    console.log('created db', db)
    return db;
  } catch (err) {
    console.error("Failed to create drizzle proxy", err);
    throw err
  }
}
