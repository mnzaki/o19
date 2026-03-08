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
import { enrichManagement } from './enrichment.js';
import { LanguageMethod } from './language/method.js';
import { LanguageEntity } from './language/entity.js';

export type * from './transform-pipeline.js';
export * from './language/index.js';

export interface Reed {
  mgmts: ManagementMetadata[];
  methods: BoundQuery<LanguageMethod>;
  entities: BoundQuery<LanguageEntity>;
  //queries: QueryHelpers;
}

export function fromHeddles(heddles: Heddles): Reed {
  const mgmts = heddles.mgmts.map(enrichManagement);
  const methods = createQueryAPI(heddles.methods.map((m) => new LanguageMethod(m)));
  const entities = createQueryAPI(heddles.entities.map((e) => new LanguageEntity(e)));
  //const queries = enrichManagementQueries(heddles.queries);

  return {
    mgmts,
    methods,
    entities
    //queries
  };
}
