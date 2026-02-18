/**
 * Person service
 * Domain service for managing people
 */

import { PersonAdaptor, type PersonPort } from '../ports/person.port.js';
import type { Person, CreatePerson, UpdatePerson } from '../domain/entities/person.js';

export class PersonService extends PersonAdaptor implements PersonPort {
  constructor(private adaptor: PersonPort) {
    super();
  }

  create(data: CreatePerson): Promise<Person> {
    return this.adaptor.create(data);
  }

  getById(id: number): Promise<Person | null> {
    return this.adaptor.getById(id);
  }

  update(id: number, data: UpdatePerson): Promise<void> {
    return this.adaptor.update(id, data);
  }

  delete(id: number): Promise<void> {
    return this.adaptor.delete(id);
  }

  search(query: string, limit?: number): Promise<Person[]> {
    return this.adaptor.search(query, limit);
  }

  getByDid(did: string): Promise<Person | null> {
    return this.adaptor.getByDid(did);
  }

  getAll(limit?: number): Promise<Person[]> {
    return this.adaptor.getAll(limit);
  }
}
