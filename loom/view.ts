import loom, { crud } from '@o19/spire-loom';
import { foundframe } from './WARP.js';

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
export class ViewMgmt extends loom.Management {
  @loom.crud.create
  addView(index: number, badge: string, label?: string): void {
    throw new Error('Imprint only');
  }

  @loom.crud.read
  getView(id: number): View {
    throw new Error('Imprint only');
  }

  /**
   * List bookmarks with optional filtering.
   *
   * @example
   * // Basic pagination
   * listBookmarks(50, 0)
   *
   * // By URI
   * listBookmarks(50, 0, { uri: 'https://example.com' })
   *
   * // Recent bookmarks
   * listBookmarks(50, 0, { after: Date.now() - 86400000 })
   */
  @loom.crud.list({ collection: true })
  listViews(limit?: number, offset?: number) {
    throw new Error('Imprint only');
  }

  @loom.crud.delete_({ soft: true })
  deleteView(id: number): boolean {
    throw new Error('Imprint only');
  }
}

@ViewMgmt.Entity()
export class View {
  id = crud.field.id();
  index = crud.field.int();
  label = crud.field.string({ nullable: true });
  badge = crud.field.string({ enum: ['FEED', 'SEARCH', 'PEOPLE'] });
  filters = crud.field.json<Record<string, unknown>>();
  sortBy = crud.field.string({ enum: ['recent', 'oldest'], default: 'recent' });
  isPinned = crud.field.bool({ default: false });
  isThestream = crud.field.bool({ default: false });

  createdAt = crud.field.createdAt();
  updatedAt = crud.field.updatedAt();
}
