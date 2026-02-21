/**
 * Content Management - Surface Imprint
 * 
 * Content creation operations for TheStream™. Each method returns a 
 * content-addressed reference (PKB URL) to the created content.
 * 
 * Reach: Global (extends from Core to Front)
 * 
 * Entity order: Media → Bookmark → Post → Person → Conversation
 * 
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import { reach, Management, crud } from '@o19/spire-loom';

@reach('Global')
class ContentMgmt extends Management {
  // ========================================================================
  // CONSTANTS
  // ========================================================================
  
  MAX_MEDIA_SIZE_BYTES = 100 * 1024 * 1024  // 100MB
  SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
  
  // ========================================================================
  // MEDIA (raw bits)
  // ========================================================================
  
  /**
   * Add a media link to the stream
   */
  @crud('create')
  addMediaLink(
    directory: string, 
    url: string, 
    title?: string, 
    mimeType?: string, 
    subpath?: string
  ): string {
    throw new Error('Imprint only');
  }
  
  // ========================================================================
  // BOOKMARK (URL + context)
  // ========================================================================
  
  /**
   * Add a bookmark to the stream
   */
  @crud('create')
  addBookmark(url: string, title?: string, notes?: string): string {
    throw new Error('Imprint only');
  }
  
  // ========================================================================
  // POST (authored, composed)
  // ========================================================================
  
  /**
   * Add a post to the stream
   */
  @crud('create')
  addPost(content: string, title?: string): string {
    throw new Error('Imprint only');
  }
  
  // ========================================================================
  // PERSON (identity)
  // ========================================================================
  
  /**
   * Add a person to the stream
   */
  @crud('create')
  addPerson(displayName: string, handle?: string): string {
    throw new Error('Imprint only');
  }
  
  // ========================================================================
  // CONVERSATION (relational)
  // ========================================================================
  
  /**
   * Add a conversation to the stream
   */
  @crud('create')
  addConversation(conversationId: string, title?: string): string {
    throw new Error('Imprint only');
  }
}

/**
 * Media link data structure
 */
interface MediaLink {
  url: string
  title?: string
  mimeType?: string
  directory: string
  subpath?: string
  seenAt: number
  pkbUrl: string
  commitHash: string
}

/**
 * Post data structure
 */
interface Post {
  content: string
  title?: string
  seenAt: number
  pkbUrl: string
  commitHash: string
}

/**
 * Person data structure
 */
interface Person {
  displayName: string
  handle?: string
  seenAt: number
  pkbUrl: string
  commitHash: string
}

/**
 * Conversation data structure
 */
interface Conversation {
  conversationId: string
  title?: string
  seenAt: number
  pkbUrl: string
  commitHash: string
}

export { ContentMgmt };
