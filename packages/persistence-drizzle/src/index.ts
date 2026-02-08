import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { IPersistenceServices } from '@repo/persistence/services';
import type { FetchLinkPreviewFn } from './services/linkPreview.service.js';
import { PersonService } from './services/person.service.js';
import { PostService } from './services/post.service.js';
import { SessionService } from './services/session.service.js';
import { ViewService } from './services/view.service.js';
import { LinkPreviewService } from './services/linkPreview.service.js';

// Types
export type {
  UAddress,
  ContentType,
  TextSpan,
  SpatiotemporalPoint,
  XanaduLink,
  LinkPreview,
  AccumulableBit,
  InputType,
  Post,
  AccumulatingPost,
  ViewFilters,
  SortBy,
  View,
  Person
} from '@repo/persistence';

export {
  createEmptyAccumulation,
  commitAccumulation
} from '@repo/persistence';

// Services
export type {
  IPostService,
  PostServiceFilters,
  IViewService,
  ISessionService,
  IPersonService,
  IPersistenceServices
} from '@repo/persistence';

export {
  PostService,
  ViewService,
  SessionService,
  PersonService,
  LinkPreviewService
} from './services/index.js';

export type { FetchLinkPreviewFn } from './services/linkPreview.service.js';

export function createServices(
  db: BaseSQLiteDatabase<any, any>,
  options?: {
    linkPreviewFetcher?: FetchLinkPreviewFn;
  }
): IPersistenceServices {
  return {
    post: new PostService(db),
    view: new ViewService(db),
    session: new SessionService(db),
    person: new PersonService(db),
    linkPreview: new LinkPreviewService(db, options?.linkPreviewFetcher)
  };
}
