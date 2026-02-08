/**
 * Person Service
 * 
 * Business logic for people/mentions using raw SQL.
 */

import type { DatabaseAdapter } from '../adapter.js';
import type { Person } from '../types/index.js';
import type { IPersonService } from './interfaces.js';

type PersonRow = {
  did: string;
  display_name: string;
  avatar_uri?: string;
  bio?: string;
  created_at: number;
  updated_at?: number;
};

export class PersonService implements IPersonService {
  constructor(private adapter: DatabaseAdapter) {}

  async search(query: string, limit: number = 50): Promise<Person[]> {
    const lowerQuery = query.toLowerCase();
    
    // Search by display_name (case-insensitive)
    const results = await this.adapter.query<PersonRow>(
      `SELECT * FROM people 
       WHERE LOWER(display_name) LIKE ? 
       ORDER BY display_name ASC 
       LIMIT ?`,
      [`%${lowerQuery}%`, limit]
    );

    return results.map(r => this.toDomainPerson(r));
  }

  async getByDid(did: string): Promise<Person | null> {
    const results = await this.adapter.query<PersonRow>(
      'SELECT * FROM people WHERE did = ?',
      [did]
    );

    return results.length > 0 ? this.toDomainPerson(results[0]) : null;
  }

  async create(person: Omit<Person, 'createdAt'>): Promise<Person> {
    const now = new Date();
    
    await this.adapter.execute(
      `INSERT INTO people (did, display_name, avatar_uri, bio, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        person.did,
        person.displayName,
        person.avatarUri ?? null,
        person.bio ?? null,
        now.getTime(),
        person.updatedAt?.getTime() ?? null
      ]
    );

    return {
      ...person,
      createdAt: now
    };
  }

  async update(did: string, updates: Partial<Person>): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (updates.displayName !== undefined) {
      sets.push('display_name = ?');
      params.push(updates.displayName);
    }
    if (updates.avatarUri !== undefined) {
      sets.push('avatar_uri = ?');
      params.push(updates.avatarUri);
    }
    if (updates.bio !== undefined) {
      sets.push('bio = ?');
      params.push(updates.bio);
    }

    if (sets.length === 0) return;

    sets.push('updated_at = ?');
    params.push(Date.now());
    params.push(did);

    await this.adapter.execute(
      `UPDATE people SET ${sets.join(', ')} WHERE did = ?`,
      params
    );
  }

  async delete(did: string): Promise<void> {
    await this.adapter.execute('DELETE FROM people WHERE did = ?', [did]);
  }

  async getAll(limit: number = 100): Promise<Person[]> {
    const results = await this.adapter.query<PersonRow>(
      'SELECT * FROM people ORDER BY display_name ASC LIMIT ?',
      [limit]
    );

    return results.map(r => this.toDomainPerson(r));
  }

  private toDomainPerson(row: PersonRow): Person {
    return {
      did: row.did,
      displayName: row.display_name,
      avatarUri: row.avatar_uri,
      bio: row.bio,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    };
  }
}
