/**
 * Person port - repository interface for Person entity
 */

import { BasePort, type BaseCrudPort } from './base.port.js';
import type { Person, CreatePerson, UpdatePerson } from '../domain/entities/person.js';

export interface PersonPort extends BaseCrudPort<Person, CreatePerson, UpdatePerson> {
  /** Search by display name or handle */
  search(query: string, limit?: number): Promise<Person[]>;
  
  /** Find by DID */
  getByDid(did: string): Promise<Person | null>;
  
  /** Get all people */
  getAll(limit?: number): Promise<Person[]>;
}

export abstract class PersonAdaptor extends BasePort implements PersonPort {
  create(_data: CreatePerson): Promise<Person> {
    this.throwNotImplemented('PersonAdaptor.create');
  }
  
  getById(_id: number): Promise<Person | null> {
    this.throwNotImplemented('PersonAdaptor.getById');
  }
  
  update(_id: number, _data: UpdatePerson): Promise<void> {
    this.throwNotImplemented('PersonAdaptor.update');
  }
  
  delete(_id: number): Promise<void> {
    this.throwNotImplemented('PersonAdaptor.delete');
  }
  
  search(_query: string, _limit?: number): Promise<Person[]> {
    this.throwNotImplemented('PersonAdaptor.search');
  }
  
  getByDid(_did: string): Promise<Person | null> {
    this.throwNotImplemented('PersonAdaptor.getByDid');
  }
  
  getAll(_limit?: number): Promise<Person[]> {
    this.throwNotImplemented('PersonAdaptor.getAll');
  }
}
