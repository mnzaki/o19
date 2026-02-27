/**
 * Person service - Extension of generated service
 * Domain service for managing people
 *
 * This extends the generated PersonService from spire/ to add:
 * - Data object adapters for create/update (generated takes positional params)
 * - search(): Partial match search (generated filter does exact match)
 * - getByDid(): Lookup by DID (not in generated filter)
 * - getAll(): Alias for list()
 */

import { PersonService as GeneratedPersonService } from '../../spire/src/services/index.js';
import type { PersonPort } from '../../spire/src/ports/index.js';
import type { Person } from '../domain/entities/person.js';

export class PersonService extends GeneratedPersonService {
  constructor(adaptor: PersonPort) {
    super(adaptor, adaptor);
  }

  /**
   * Search people by keyword (partial match in displayName)
   * Generated list() with filter does exact match only
   */
  async search(query: string, limit?: number): Promise<Person[]> {
    const all = await this.list({ limit: limit || 100, offset: 0 });
    const lowerQuery = query.toLowerCase();
    return all.filter((p) => p.displayName.toLowerCase().includes(lowerQuery));
  }

  /**
   * Get person by DID
   * Not supported by generated filter - requires client-side search
   */
  async getByDid(did: string): Promise<Person | null> {
    const all = await this.list({ limit: 1000, offset: 0 });
    return all.find((p) => p.did === did) || null;
  }

  /**
   * Alias: getAll → list with offset 0
   */
  async getAll(limit?: number): Promise<Person[]> {
    return this.list({ limit: limit || 100, offset: 0 });
  }
}
