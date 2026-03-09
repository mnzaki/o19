/**
 * Reed
 *
 * Workspace discovery and Management collection.
 * The reed scans the monorepo to understand its structure
 * before weaving begins.
 */

import type { ManagementMetadata } from '../../warp/metadata.js';
import { type Heddles } from '../heddles/index.js';
import { createQueryAPI, BoundQuery } from '../sley/query.js';
import { LanguageMethod } from './method.js';
import { LanguageEntity } from './entity.js';

export * from './language/index.js';
export * from './method.js';
export * from './entity.js';

export interface Reed {
  mgmts: ManagementMetadata[];
  methods: BoundQuery<LanguageMethod>;
  entities: BoundQuery<LanguageEntity>;
  //queries: QueryHelpers;
}

export function fromHeddles(heddles: Heddles): Reed {
  const methods = createQueryAPI(heddles.methods.map((m) => new LanguageMethod(m)));
  const entities = createQueryAPI(heddles.entities.map((e) => new LanguageEntity(e)));
  //const queries = createQueryAPI

  return {
    mgmts: heddles.mgmts,
    methods,
    entities
    //queries
  };
}
