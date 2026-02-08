/**
 * Persistence Tauri
 *
 * Proxies from drizzle to `tauri-plugin-sql` via `src-tauri/src/drizzle_proxy.rs`
 */

import { createServices as createDrizzleServices, type IPersistenceServices } from '@repo/persistence-drizzle';
import { createDrizzleProxy } from './drizzleProxy.js';

export function createServices(dbName = "database.db"): IPersistenceServices {
  // @ts-ignore
  return createDrizzleServices(createDrizzleProxy(dbName));
}

export type { IPersistenceServices } from '@repo/persistence-drizzle';
