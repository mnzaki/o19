/**
 * Reed
 *
 * Workspace discovery and Management collection.
 * The reed scans the monorepo to understand its structure
 * before weaving begins.
 */

import { type Heddles } from '../heddles/index.js';
import { createQueryAPI, BoundQuery } from '../sley/query.js';
import { LanguageMethod } from './method.js';
import { LanguageEntity } from './entity.js';
import { LanguageMgmt } from './mgmt.js';
import { importsDiviner } from './postrequisites.js';

export * from './language/index.js';
export * from './method.js';
export * from './entity.js';
export * from './mgmt.js';
export * from './postrequisites.js';

export interface Reed {
  mgmts: BoundQuery<LanguageMgmt>;
  methods: BoundQuery<LanguageMethod>;
  entities: BoundQuery<LanguageEntity>;
  //queries: QueryHelpers;
}

export function fromHeddles(heddles: Heddles): Reed {
  const methods = createQueryAPI(
    heddles.methods.map((m) => new LanguageMethod(m)),
    'methods',
    { imports: importsDiviner({}) }
  );
  const entities = createQueryAPI(
    heddles.entities.map((e) => new LanguageEntity(e)),
    'entities',
    {}  // No diviners for entities yet
  );
  const mgmts = createQueryAPI(
    heddles.mgmts.map((m) => new LanguageMgmt(m)),
    'mgmts'
  );

  return {
    mgmts,
    methods,
    entities
    //queries
  };
}
