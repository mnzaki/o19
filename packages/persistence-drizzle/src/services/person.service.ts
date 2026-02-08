/**
 * Person Service
 * 
 * Business logic for people/mentions using Drizzle ORM.
 */

import { eq, asc, like, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Person } from '@repo/persistence';
import type { IPersonService } from '@repo/persistence/services';
import { people } from '../schema.js';

export class PersonService implements IPersonService {
  constructor(private db: BaseSQLiteDatabase<any, any>) {}

  async search(query: string, limit: number = 50): Promise<Person[]> {
    const lowerQuery = query.toLowerCase();
    
    // Search by displayName (case-insensitive using like)
    const results = await this.db.select()
      .from(people)
      .where(like(sql`LOWER(${people.displayName})`, `%${lowerQuery}%`))
      .orderBy(asc(people.displayName))
      .limit(limit);

    return results.map(r => this.toDomainPerson(r));
  }

  async getByDid(did: string): Promise<Person | null> {
    const result = await this.db.select().from(people).where(eq(people.did, did)).limit(1);
    return result.length > 0 ? this.toDomainPerson(result[0]) : null;
  }

  async create(person: Omit<Person, 'createdAt'>): Promise<Person> {
    const now = new Date();
    
    await this.db.insert(people).values({
      did: person.did,
      displayName: person.displayName,
      avatarUri: person.avatarUri,
      bio: person.bio,
      createdAt: now,
      updatedAt: person.updatedAt
    });

    return {
      ...person,
      createdAt: now
    };
  }

  async update(did: string, updates: Partial<Person>): Promise<void> {
    const updateData: Partial<typeof people.$inferInsert> = {};
    
    if (updates.displayName !== undefined) {
      updateData.displayName = updates.displayName;
    }
    if (updates.avatarUri !== undefined) {
      updateData.avatarUri = updates.avatarUri;
    }
    if (updates.bio !== undefined) {
      updateData.bio = updates.bio;
    }
    
    updateData.updatedAt = new Date();
    
    await this.db.update(people).set(updateData).where(eq(people.did, did));
  }

  async delete(did: string): Promise<void> {
    await this.db.delete(people).where(eq(people.did, did));
  }

  async getAll(limit: number = 100): Promise<Person[]> {
    const results = await this.db.select()
      .from(people)
      .orderBy(asc(people.displayName))
      .limit(limit);

    return results.map(r => this.toDomainPerson(r));
  }

  private toDomainPerson(row: typeof people.$inferSelect): Person {
    return {
      did: row.did,
      displayName: row.displayName,
      avatarUri: row.avatarUri ?? undefined,
      bio: row.bio ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? undefined
    };
  }
}
