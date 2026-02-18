/**
 * Base port/adaptor interface
 * 
 * All database ports extend this abstract class.
 * Methods throw "not implemented" by default.
 * 
 * Pattern: Service extends Port, receives Port instance,
 * delegates to instance while inheriting the interface.
 */

export abstract class BasePort {
  protected throwNotImplemented(method: string): never {
    throw new Error(`Database method '${method}' not implemented`);
  }
}

/** Interface for entities with numeric IDs */
export interface EntityWithId {
  id: number;
}

/** Base CRUD operations interface */
export interface BaseCrudPort<T extends EntityWithId, Create, Update> {
  create(data: Create): Promise<T>;
  getById(id: number): Promise<T | null>;
  update(id: number, data: Update): Promise<void>;
  delete(id: number): Promise<void>;
}
