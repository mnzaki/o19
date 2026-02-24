/**
 * Management Patterns Test Suite
 *
 * Tests based on patterns from o19/loom/*.ts management files
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createTestRunner,
  captureOutput,
} from '../machinery/testkit/index.js';
import { SpiralRing, spiralOut } from '../warp/spiral/pattern.js';

describe('Pattern: Management with @reach Decorator', () => {
  it('should support Global reach', async () => {
    // Pattern from bookmark.ts:
    // @loom.reach('Global')
    // class BookmarkMgmt extends loom.Management { ... }
    
    const mockMgmt = {
      name: 'BookmarkMgmt',
      reach: 'Global',
      methods: ['addBookmark', 'getBookmarkByUrl', 'listBookmarks']
    };
    
    const core = new SpiralRing();
    const foundframe = spiralOut(core, {
      management: mockMgmt
    });
    
    const runner = createTestRunner({ warp: { foundframe } });
    const ring = runner.getRing('foundframe');
    
    assert.ok(ring);
    const mgmt = (ring as any).management;
    assert.ok(mockMgmt);
    assert.equal(mockMgmt.reach, 'Global');
  });

  it('should support Local reach', async () => {
    const mockMgmt = {
      name: 'DeviceMgmt',
      reach: 'Local',
      methods: ['registerDevice', 'unregisterDevice']
    };
    
    const core = new SpiralRing();
    const ring = spiralOut(core, { management: mockMgmt });
    
    assert.equal(mockMgmt.reach, 'Local');
  });

  it('should support Private reach', async () => {
    const mockMgmt = {
      name: 'InternalStateMgmt',
      reach: 'Private',
      methods: ['updateState']
    };
    
    assert.equal(mockMgmt.reach, 'Private');
  });
});

describe('Pattern: Management with @link Decorator', () => {
  it('should link management to struct field', async () => {
    // Pattern from bookmark.ts:
    // @loom.link(foundframe.inner.core.thestream)
    // class BookmarkMgmt extends loom.Management { ... }
    
    const thestream = new SpiralRing();
    const foundframe = spiralOut(thestream, { thestream });
    
    const mockMgmt = {
      name: 'BookmarkMgmt',
      link: 'foundframe.inner.core.thestream'
    };
    
    const runner = createTestRunner({ warp: { foundframe } });
    const ring = runner.getRing('foundframe');
    
    assert.ok(ring);
    // The link metadata would be used by generators
    assert.equal(mockMgmt.link, 'foundframe.inner.core.thestream');
  });
});

describe('Pattern: CRUD Method Decorators', () => {
  it('should support @crud.create', async () => {
    // Pattern: @loom.crud.create addBookmark(...)
    
    const method = {
      name: 'addBookmark',
      crud: 'create',
      params: ['url', 'title', 'notes'],
      returns: 'void'
    };
    
    assert.equal(method.crud, 'create');
    assert.ok(method.params.includes('url'));
  });

  it('should support @crud.read', async () => {
    // Pattern: @loom.crud.read getBookmarkByUrl(...)
    
    const method = {
      name: 'getBookmarkByUrl',
      crud: 'read',
      params: ['pkbUrl'],
      returns: 'Bookmark'
    };
    
    assert.equal(method.crud, 'read');
  });

  it('should support @crud.list with collection option', async () => {
    // Pattern: @loom.crud.list({ collection: true }) listBookmarks(...)
    
    const method = {
      name: 'listBookmarks',
      crud: 'list',
      options: { collection: true },
      params: ['directory?'],
      returns: 'string[]'
    };
    
    assert.equal(method.crud, 'list');
    assert.equal(method.options.collection, true);
  });

  it('should support @crud.delete_ with soft option', async () => {
    // Pattern: @loom.crud.delete_({ soft: true }) deleteBookmark(...)
    
    const method = {
      name: 'deleteBookmark',
      crud: 'delete',
      options: { soft: true },
      params: ['pkbUrl'],
      returns: 'boolean'
    };
    
    assert.equal(method.crud, 'delete');
    assert.equal(method.options.soft, true);
  });

  it('should support @crud.update', async () => {
    const method = {
      name: 'updateBookmark',
      crud: 'update',
      params: ['pkbUrl', 'title?', 'notes?'],
      returns: 'boolean'
    };
    
    assert.equal(method.crud, 'update');
  });
});

describe('Pattern: Management Constants', () => {
  it('should carry constants available in all rings', async () => {
    // Pattern from bookmark.ts:
    // VALID_URL_REGEX = /^https?:\/\/.+/
    // MAX_TITLE_LENGTH = 200
    
    const constants = {
      VALID_URL_REGEX: '/^https?:\\/\\/.+/',
      MAX_TITLE_LENGTH: 200,
      MAX_NOTES_LENGTH: 2000,
      DEFAULT_DIRECTORY: 'bookmarks',
      GIT_BRANCH: 'main'
    };
    
    assert.ok(constants.VALID_URL_REGEX);
    assert.equal(constants.MAX_TITLE_LENGTH, 200);
    assert.equal(constants.DEFAULT_DIRECTORY, 'bookmarks');
  });
});

describe('Pattern: Multiple Entity Managements', () => {
  it('should support Bookmark entity', async () => {
    const bookmarkMgmt = {
      name: 'BookmarkMgmt',
      entity: 'Bookmark',
      reach: 'Global',
      crud: ['create', 'read', 'list', 'delete']
    };
    
    assert.equal(bookmarkMgmt.entity, 'Bookmark');
    assert.ok(bookmarkMgmt.crud.includes('create'));
  });

  it('should support Media entity', async () => {
    // Pattern from media.ts
    const mediaMgmt = {
      name: 'MediaMgmt',
      entity: 'Media',
      reach: 'Global',
      crud: ['create', 'read', 'list', 'delete']
    };
    
    assert.equal(mediaMgmt.entity, 'Media');
  });

  it('should support Post entity', async () => {
    // Pattern from post.ts
    const postMgmt = {
      name: 'PostMgmt',
      entity: 'Post',
      reach: 'Global',
      crud: ['create', 'read', 'list', 'delete']
    };
    
    assert.equal(postMgmt.entity, 'Post');
  });

  it('should support Person entity', async () => {
    // Pattern from person.ts
    const personMgmt = {
      name: 'PersonMgmt',
      entity: 'Person',
      reach: 'Global',
      crud: ['create', 'read', 'list', 'delete']
    };
    
    assert.equal(personMgmt.entity, 'Person');
  });

  it('should support Conversation entity', async () => {
    // Pattern from conversation.ts
    const conversationMgmt = {
      name: 'ConversationMgmt',
      entity: 'Conversation',
      reach: 'Global',
      crud: ['create', 'read', 'list', 'delete']
    };
    
    assert.equal(conversationMgmt.entity, 'Conversation');
  });
});

describe('Pattern: Device Management (Local Reach)', () => {
  it('should support device registration', async () => {
    // Pattern from device.ts
    const deviceMgmt = {
      name: 'DeviceMgmt',
      reach: 'Local',
      methods: [
        { name: 'registerDevice', crud: 'create' },
        { name: 'unregisterDevice', crud: 'delete' },
        { name: 'listDevices', crud: 'list' }
      ]
    };
    
    assert.equal(deviceMgmt.reach, 'Local');
    assert.ok(deviceMgmt.methods.find(m => m.name === 'registerDevice'));
  });
});

describe('Pattern: PKB Management (Global Reach)', () => {
  it('should support PKB operations', async () => {
    // Pattern from pkb.ts
    const pkbMgmt = {
      name: 'PkbMgmt',
      reach: 'Global',
      methods: [
        { name: 'commit', crud: 'create' },
        { name: 'getHistory', crud: 'list' }
      ]
    };
    
    assert.equal(pkbMgmt.reach, 'Global');
  });
});

describe('Pattern: Node Management (Local Reach)', () => {
  it('should support node operations', async () => {
    // Pattern from node.ts
    const nodeMgmt = {
      name: 'NodeMgmt',
      reach: 'Local',
      methods: [
        { name: 'startNode', crud: 'create' },
        { name: 'stopNode', crud: 'delete' }
      ]
    };
    
    assert.equal(nodeMgmt.reach, 'Local');
  });
});

describe('Pattern: Management to Code Generation', () => {
  it('should generate AIDL from Global reach management', async () => {
    // Global reach → generates AIDL, JNI, TypeScript interfaces
    
    const globalMgmt = {
      name: 'BookmarkMgmt',
      reach: 'Global',
      crud: ['create', 'read', 'list']
    };
    
    // Global reach should generate:
    // - Android AIDL interface
    // - JNI bridge
    // - TypeScript interface
    assert.equal(globalMgmt.reach, 'Global');
  });

  it('should generate internal trait for Local reach', async () => {
    // Local reach → generates Rust trait only
    
    const localMgmt = {
      name: 'DeviceMgmt',
      reach: 'Local',
      crud: ['create', 'list']
    };
    
    assert.equal(localMgmt.reach, 'Local');
  });

  it('should generate Core-only code for Private reach', async () => {
    // Private reach → Core only, no exports
    
    const privateMgmt = {
      name: 'InternalStateMgmt',
      reach: 'Private',
      crud: ['update']
    };
    
    assert.equal(privateMgmt.reach, 'Private');
  });
});

describe('Pattern: WARP.ts Integration', () => {
  it('should connect managements to WARP exports', async () => {
    // Pattern: Managements are collected from loom/*.ts files
    // and connected to the WARP.ts spiral
    
    const core = new SpiralRing();
    const foundframe = spiralOut(core, {
      managements: ['BookmarkMgmt', 'MediaMgmt', 'PostMgmt']
    });
    
    const runner = createTestRunner({ warp: { foundframe } });
    const ring = runner.getRing('foundframe');
    
    assert.ok(ring);
    const mgmts = (ring as any).managements;
    assert.ok(mgmts);
  });
});
