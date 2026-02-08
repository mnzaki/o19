/**
 * Persistence Tauri
 *
 * Proxies from drizzle to `tauri-plugin-sql` via `src-tauri/src/drizzle_proxy.rs`
 */

import { invoke } from '@tauri-apps/api/core';
import { createServices as createDrizzleServices, type IPersistenceServices, type FetchLinkPreviewFn } from '@repo/persistence-drizzle';
import { createDrizzleProxy } from './drizzleProxy.js';

// Fetcher that uses the Tauri command
const linkPreviewFetcher: FetchLinkPreviewFn = async (url: string) => {
  const result = await invoke<{
    title?: string;
    description?: string;
    image_url?: string;
    images?: string[];
    site_name?: string;
  }>('link_preview_json', { url });
  
  return {
    title: result.title,
    description: result.description,
    image_url: result.image_url,
    images: result.images,
    site_name: result.site_name
  };
};

export function createServices(dbName = "database.db"): IPersistenceServices {
  // @ts-ignore
  return createDrizzleServices(createDrizzleProxy(dbName), {
    linkPreviewFetcher
  });
}

export type { IPersistenceServices, FetchLinkPreviewFn } from '@repo/persistence-drizzle';
