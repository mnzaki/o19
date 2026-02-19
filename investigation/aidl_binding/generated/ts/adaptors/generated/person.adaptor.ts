/**
 * Auto-generated Person Adaptor from IFoundframeRadicle.aidl
 */

import { invoke } from '@tauri-apps/api/core';
import { DrizzlePersonAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Person, CreatePerson } from '@o19/foundframe-front/domain';
import type { StreamEntryResult } from '../index.js';

export class TauriPersonAdaptor extends DrizzlePersonAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  async create(data: CreatePerson): Promise<Person> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|add_person', {
      displayName: data.displayName,
      handle: data.handle
    });
    return {
      id: result.id ?? 0,
      // TODO: Map other fields from data
      createdAt: new Date(result.seenAt)
    } as Person;
  }

    async addPerson(displayName?: string, handle?: string): Promise<Person> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|add_person', { displayName, handle });
    return this.reconstructPerson(result, data);
  }
}
