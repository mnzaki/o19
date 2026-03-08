import { Name } from '../stringing.js';

/**
 * Link metadata for routing to struct fields.
 */
export interface MethodLink {
  /** Field name to access (e.g., 'device_manager') */
  fieldName: string;
  /** Wrapper types: e.g., ['Option', 'Mutex'] */
  wrappers?: string[];
}

/**
 * Base parameter interface — minimal contract for all params.
 *
 * This is what comes from Management method metadata.
 */
export interface MethodParam {
  /** Parameter name (as declared in Management) */
  name: string;
  /** TypeScript type */
  type: string;
  /** Whether parameter is optional */
  optional?: boolean;
}

/**
 * Method — core data class, no language-specific enhancement.
 *
 * This is what comes from Management metadata collection.
 * Language enhancement happens separately via the enhancement system.
 *
 * CRUD classification is stored in tags (e.g., 'crud:create'), not as
 * a direct property. Use getCrudNameFromTags() to derive crudName.
 *
 */
export class Method {
  public readonly name: Name;

  constructor(
    /** Management class this method belongs to */
    public readonly managementName: string | undefined,
    /** Bind-point name with management prefix (e.g., 'bookmark_add_bookmark') */
    name: string,
    /** JSDoc description */
    public readonly description: string | undefined,
    /** Method parameters */
    public readonly params: MethodParam[],
    /** TypeScript return type */
    public readonly returnType: string,
    /** Link metadata for routing to struct fields */
    public readonly link: MethodLink,
    /** Tags from decorators (e.g., 'crud:create', 'auth:required') */
    public readonly tags: string[] | undefined,
    /** CRUD method name (added by CRUD pipeline, derived from tags) */
    public crudName?: string,
    /** Whether return is a collection */
    public readonly isCollection = false
  ) {
    this.name = new Name(name);
  }

  /**
   * Check if this method has a specific tag.
   */
  hasTag(tag: string): boolean {
    return this.tags?.includes(tag) ?? false;
  }

  /**
   * Get CRUD operation from tags (e.g., 'create', 'read').
   */
  getCrudOperation(): string | undefined {
    return this.tags?.find((t) => t.startsWith('crud:'))?.replace('crud:', '');
  }

  /**
   * CRUD operation type (create, read, update, delete, list).
   * Convenience getter that calls getCrudOperation().
   */
  get crudOperation(): string | undefined {
    return this.getCrudOperation();
  }
}
