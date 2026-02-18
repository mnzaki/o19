/**
 * Tauri Person Adaptor
 * 
 * Extends the DrizzlePersonAdaptor and overrides write methods
 * to invoke Tauri commands instead of direct DB operations.
 */

import { DrizzlePersonAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Person, CreatePerson, UpdatePerson } from '@o19/foundframe-front/domain';
import { invoke } from '@tauri-apps/api/core';

export class TauriPersonAdaptor extends DrizzlePersonAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  /**
   * Create a person via Tauri command
   * This delegates to the Platform implementation which may be local (desktop)
   * or remote (Android service).
   */
  async create(data: CreatePerson): Promise<Person> {
    // Call the Tauri command which delegates to Platform
    const result = await invoke<{
      id: number | null;
      seenAt: number;
      reference: string;
    }>('add_person', {
      displayName: data.displayName,
      handle: data.handle,
    });

    // Query the created person from DB
    // We need to find by display name since we don't have the ID yet
    const people = await this.query();
    const person = people.find(p => p.displayName === data.displayName);
    if (!person) {
      throw new Error('Person was created but not found in database');
    }
    return person;
  }

  /**
   * Update is not supported via stream
   * For now, delegate to parent
   */
  async update(id: number, data: UpdatePerson): Promise<void> {
    return super.update(id, data);
  }

  /**
   * Delete is not supported via stream
   * For now, delegate to parent
   */
  async delete(id: number): Promise<void> {
    return super.delete(id);
  }
}
