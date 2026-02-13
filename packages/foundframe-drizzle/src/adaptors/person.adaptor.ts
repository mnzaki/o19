/**
 * Drizzle implementation of PersonPort
 */

import { eq, desc, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { PersonAdaptor } from '@o19/foundframe/ports';
import type { PersonPort } from '@o19/foundframe/ports';
import type { Person, CreatePerson, UpdatePerson } from '@o19/foundframe/domain';
import { person } from '../schema/index.js';

export class DrizzlePersonAdaptor extends PersonAdaptor implements PersonPort {
  constructor(private db: BaseSQLiteDatabase<any, any>) {
    super();
  }

  async create(data: CreatePerson): Promise<Person> {
    const result = await this.db.insert(person).values({
      displayName: data.displayName,
      handle: data.handle,
      avatarMediaId: data.avatarMediaId,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return this.toDomain(result[0]);
  }

  async getById(id: number): Promise<Person | null> {
    const result = await this.db.select().from(person).where(eq(person.id, id)).limit(1);
    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async update(id: number, data: UpdatePerson): Promise<void> {
    const updateData: Partial<typeof person.$inferInsert> = {};
    
    if (data.displayName) updateData.displayName = data.displayName;
    if (data.handle !== undefined) updateData.handle = data.handle;
    if (data.avatarMediaId !== undefined) updateData.avatarMediaId = data.avatarMediaId;
    if (data.metadata) updateData.metadata = data.metadata;
    
    updateData.updatedAt = new Date();

    await this.db.update(person).set(updateData).where(eq(person.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(person).where(eq(person.id, id));
  }

  async search(query: string, limit?: number): Promise<Person[]> {
    const lowerQuery = `%${query.toLowerCase()}%`;
    let dbQuery = this.db
      .select()
      .from(person)
      .where(
        sql`LOWER(${person.displayName}) LIKE ${lowerQuery} OR 
            LOWER(${person.handle}) LIKE ${lowerQuery}`
      )
      .orderBy(desc(person.createdAt))
      .$dynamic();

    if (limit) {
      dbQuery = dbQuery.limit(limit);
    }

    const results = await dbQuery;
    return results.map(r => this.toDomain(r));
  }

  async getByDid(did: string): Promise<Person | null> {
    const result = await this.db
      .select()
      .from(person)
      .where(sql`${person.metadata}->>'did' = ${did}`)
      .limit(1);
    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async getAll(limit?: number): Promise<Person[]> {
    let query = this.db.select().from(person).orderBy(desc(person.createdAt)).$dynamic();
    if (limit) {
      query = query.limit(limit);
    }
    const results = await query;
    return results.map(r => this.toDomain(r));
  }

  private toDomain(row: typeof person.$inferSelect): Person {
    return {
      id: row.id,
      displayName: row.displayName,
      handle: row.handle ?? undefined,
      avatarMediaId: row.avatarMediaId ?? undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? undefined,
    };
  }
}
