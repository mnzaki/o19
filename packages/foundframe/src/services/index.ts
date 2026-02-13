/**
 * Domain services
 * 
 * Services contain business logic and orchestrate domain operations.
 * Each service extends its corresponding Port (adaptor base class)
 * and receives a concrete Port implementation in its constructor.
 * 
 * Pattern: Service(port) -> delegates to port for persistence
 */

export { PersonService } from './person.service.js';
export { MediaService } from './media.service.js';
export { PostService, createEmptyAccumulation } from './post.service.js';
export { BookmarkService } from './bookmark.service.js';
export { ConversationService } from './conversation.service.js';
export { StreamService } from './stream.service.js';
export { ViewService } from './view.service.js';
export { PreviewService } from './preview.service.js';

/**
 * Aggregate service factory
 * Creates domain services wired to concrete adaptors
 */
import type { DatabasePorts } from '../ports/index.js';

export interface DomainServices {
  person: import('./person.service.js').PersonService;
  media: import('./media.service.js').MediaService;
  post: import('./post.service.js').PostService;
  bookmark: import('./bookmark.service.js').BookmarkService;
  conversation: import('./conversation.service.js').ConversationService;
  stream: import('./stream.service.js').StreamService;
  view: import('./view.service.js').ViewService;
  preview: import('./preview.service.js').PreviewService;
}

// Async version for dynamic imports (if needed)
export async function createDomainServicesAsync(ports: DatabasePorts): Promise<DomainServices> {
  const [
    { PersonService },
    { MediaService },
    { PostService },
    { BookmarkService },
    { ConversationService },
    { StreamService },
    { ViewService },
    { PreviewService },
  ] = await Promise.all([
    import('./person.service.js'),
    import('./media.service.js'),
    import('./post.service.js'),
    import('./bookmark.service.js'),
    import('./conversation.service.js'),
    import('./stream.service.js'),
    import('./view.service.js'),
    import('./preview.service.js'),
  ]);
  
  return {
    person: new PersonService(ports.person),
    media: new MediaService(ports.media),
    post: new PostService(ports.post),
    bookmark: new BookmarkService(ports.bookmark),
    conversation: new ConversationService(ports.conversation),
    stream: new StreamService(ports.stream),
    view: new ViewService(ports.view),
    preview: new PreviewService(ports.preview),
  };
}

// Synchronous version (services are lightweight)
import { PersonService } from './person.service.js';
import { MediaService } from './media.service.js';
import { PostService } from './post.service.js';
import { BookmarkService } from './bookmark.service.js';
import { ConversationService } from './conversation.service.js';
import { StreamService } from './stream.service.js';
import { ViewService } from './view.service.js';
import { PreviewService } from './preview.service.js';

export function createServices(ports: DatabasePorts): DomainServices {
  return {
    person: new PersonService(ports.person),
    media: new MediaService(ports.media),
    post: new PostService(ports.post),
    bookmark: new BookmarkService(ports.bookmark),
    conversation: new ConversationService(ports.conversation),
    stream: new StreamService(ports.stream),
    view: new ViewService(ports.view),
    preview: new PreviewService(ports.preview),
  };
}
