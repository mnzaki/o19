/**
 * Person entity
 * Someone encountered in the stream - could be self, contact, or discovered
 */

export interface Person {
  id: number;
  did?: string; // Decentralized identifier (future: PKI)
  displayName: string;
  handle?: string; // @username
  avatarMediaId?: number; // Reference to media
  metadata?: Record<string, unknown>; // extensible: KERI AID, etc
  createdAt: Date;
  updatedAt?: Date;
}

/** Properties required to create a person */
export type CreatePerson = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>;

/** Properties that can be updated */
export type UpdatePerson = Partial<Omit<Person, 'id' | 'createdAt'>> & { id: Person['id'] };

/** Filter criteria for person queries (matches loom PersonFilter) */
export interface PersonFilter {
  /** Filter by handle (exact match) */
  handle?: string;
  /** Filter by DID (exact match) */
  did?: string;
  /** Only return entries with createdAt >= this timestamp (inclusive) */
  after?: number;
  /** Only return entries with createdAt <= this timestamp (inclusive) */
  before?: number;
}
