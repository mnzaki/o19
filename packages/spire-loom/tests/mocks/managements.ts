/**
 * Management Mocks
 *
 * Mock management implementations for testing.
 */

export interface MockMethod {
  name: string;
  crud?: 'create' | 'read' | 'update' | 'delete' | 'list';
  params?: string[];
  returns?: string;
}

export interface MockManagementConfig {
  name: string;
  entity?: string;
  reach?: 'Global' | 'Local' | 'Private';
  link?: string;
  methods?: MockMethod[];
  constants?: Record<string, any>;
}

/**
 * Create a mock management.
 */
export function createMockManagement(config: MockManagementConfig): any {
  return {
    name: config.name,
    entity: config.entity || config.name.replace('Mgmt', ''),
    reach: config.reach || 'Global',
    link: config.link,
    methods: config.methods || [],
    constants: config.constants || {}
  };
}

/**
 * Pre-built mock managements.
 */
export const mockManagements = {
  /**
   * Bookmark management (Global reach).
   */
  bookmark: (): any => createMockManagement({
    name: 'BookmarkMgmt',
    entity: 'Bookmark',
    reach: 'Global',
    link: 'foundframe.inner.core.thestream',
    methods: [
      { name: 'addBookmark', crud: 'create', params: ['url', 'title', 'notes'] },
      { name: 'getBookmarkByUrl', crud: 'read', params: ['pkbUrl'] },
      { name: 'listBookmarks', crud: 'list', params: ['directory?'] },
      { name: 'deleteBookmark', crud: 'delete', params: ['pkbUrl'] }
    ],
    constants: {
      VALID_URL_REGEX: '/^https?:\\/\\/.+/',
      MAX_TITLE_LENGTH: 200,
      MAX_NOTES_LENGTH: 2000,
      DEFAULT_DIRECTORY: 'bookmarks'
    }
  }),

  /**
   * Media management (Global reach).
   */
  media: (): any => createMockManagement({
    name: 'MediaMgmt',
    entity: 'Media',
    reach: 'Global',
    methods: [
      { name: 'addMedia', crud: 'create' },
      { name: 'getMedia', crud: 'read' },
      { name: 'listMedia', crud: 'list' },
      { name: 'deleteMedia', crud: 'delete' }
    ]
  }),

  /**
   * Post management (Global reach).
   */
  post: (): any => createMockManagement({
    name: 'PostMgmt',
    entity: 'Post',
    reach: 'Global',
    methods: [
      { name: 'createPost', crud: 'create' },
      { name: 'getPost', crud: 'read' },
      { name: 'listPosts', crud: 'list' },
      { name: 'updatePost', crud: 'update' },
      { name: 'deletePost', crud: 'delete' }
    ]
  }),

  /**
   * Person management (Global reach).
   */
  person: (): any => createMockManagement({
    name: 'PersonMgmt',
    entity: 'Person',
    reach: 'Global',
    methods: [
      { name: 'addPerson', crud: 'create' },
      { name: 'getPerson', crud: 'read' },
      { name: 'listPeople', crud: 'list' },
      { name: 'updatePerson', crud: 'update' },
      { name: 'deletePerson', crud: 'delete' }
    ]
  }),

  /**
   * Conversation management (Global reach).
   */
  conversation: (): any => createMockManagement({
    name: 'ConversationMgmt',
    entity: 'Conversation',
    reach: 'Global',
    methods: [
      { name: 'startConversation', crud: 'create' },
      { name: 'getConversation', crud: 'read' },
      { name: 'listConversations', crud: 'list' }
    ]
  }),

  /**
   * Device management (Local reach).
   */
  device: (): any => createMockManagement({
    name: 'DeviceMgmt',
    entity: 'Device',
    reach: 'Local',
    methods: [
      { name: 'registerDevice', crud: 'create' },
      { name: 'unregisterDevice', crud: 'delete' },
      { name: 'listDevices', crud: 'list' }
    ]
  }),

  /**
   * PKB management (Global reach).
   */
  pkb: (): any => createMockManagement({
    name: 'PkbMgmt',
    entity: 'Pkb',
    reach: 'Global',
    methods: [
      { name: 'commit', crud: 'create' },
      { name: 'getHistory', crud: 'list' }
    ]
  }),

  /**
   * Node management (Local reach).
   */
  node: (): any => createMockManagement({
    name: 'NodeMgmt',
    entity: 'Node',
    reach: 'Local',
    methods: [
      { name: 'startNode', crud: 'create' },
      { name: 'stopNode', crud: 'delete' }
    ]
  })
};
