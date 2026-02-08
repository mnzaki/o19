/**
 * View Service
 * 
 * Business logic for Views using raw SQL.
 */

import type { DatabaseAdapter } from '../adapter.js';
import type { View, ViewFilters } from '../types/index.js';
import type { IViewService } from './interfaces.js';

interface ViewRow {
  id: string;
  view_index: number;
  filters: string | ViewFilters;
  sort_by: 'recent' | 'oldest';
  label: string | null;
  created_at: number;
  is_feed: number;
}

export class ViewService implements IViewService {
  constructor(private adapter: DatabaseAdapter) {}

  async getAll(): Promise<View[]> {
    const results = await this.adapter.query<ViewRow>(
      'SELECT * FROM views ORDER BY view_index ASC'
    );
    return results.map(r => this.toDomainView(r));
  }

  async getById(id: string): Promise<View | null> {
    const results = await this.adapter.query<ViewRow>(
      'SELECT * FROM views WHERE id = ?',
      [id]
    );
    return results.length > 0 ? this.toDomainView(results[0]) : null;
  }

  async create(filters: Partial<ViewFilters> = {}): Promise<View> {
    const id = `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    // Get next index
    const countResult = await this.adapter.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM views'
    );
    const viewIndex = countResult[0]?.count ?? 0;

    const view: View = {
      id,
      index: viewIndex,
      filters: filters ?? {},
      sortBy: 'recent',
      createdAt: new Date()
    };

    await this.adapter.execute(
      `INSERT INTO views (id, view_index, filters, sort_by, label, created_at, is_feed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        view.id,
        viewIndex,
        JSON.stringify(view.filters),
        view.sortBy,
        view.label ?? null,
        view.createdAt.getTime(),
        0
      ]
    );

    return view;
  }

  async update(id: string, updates: Partial<View>): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (updates.filters) {
      sets.push('filters = ?');
      params.push(JSON.stringify(updates.filters));
    }
    if (updates.sortBy) {
      sets.push('sort_by = ?');
      params.push(updates.sortBy);
    }
    if (updates.label !== undefined) {
      sets.push('label = ?');
      params.push(updates.label);
    }
    if (updates.index !== undefined) {
      sets.push('view_index = ?');
      params.push(updates.index);
    }

    if (sets.length === 0) return;

    params.push(id);
    await this.adapter.execute(
      `UPDATE views SET ${sets.join(', ')} WHERE id = ?`,
      params
    );
  }

  async delete(id: string): Promise<void> {
    await this.adapter.execute('DELETE FROM views WHERE id = ?', [id]);
    
    // Reindex remaining views
    const views = await this.getAll();
    for (let i = 0; i < views.length; i++) {
      if (views[i].index !== i) {
        await this.update(views[i].id, { index: i });
      }
    }
  }

  async reorder(indices: number[]): Promise<void> {
    const views = await this.getAll();
    for (let newIndex = 0; newIndex < indices.length; newIndex++) {
      const oldIndex = indices[newIndex];
      if (views[oldIndex]) {
        await this.update(views[oldIndex].id, { index: newIndex });
      }
    }
  }

  async getFeed(): Promise<View> {
    const results = await this.adapter.query<ViewRow>(
      'SELECT * FROM views WHERE is_feed = 1 LIMIT 1'
    );

    if (results.length > 0) {
      return this.toDomainView(results[0]);
    }

    // Create The Feed™
    const feed: View = {
      id: 'feed',
      index: 0,
      filters: {},
      sortBy: 'recent',
      label: 'Feed',
      createdAt: new Date()
    };

    await this.adapter.execute(
      `INSERT INTO views (id, view_index, filters, sort_by, label, created_at, is_feed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        feed.id,
        feed.index,
        JSON.stringify(feed.filters),
        feed.sortBy,
        feed.label,
        feed.createdAt.getTime(),
        1
      ]
    );

    return feed;
  }

  async closeAllChildViews(): Promise<void> {
    await this.adapter.execute('DELETE FROM views WHERE is_feed = 0');
  }

  private toDomainView(row: ViewRow): View {
    return {
      id: row.id,
      index: row.view_index,
      filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
      sortBy: row.sort_by,
      label: row.label ?? undefined,
      createdAt: new Date(row.created_at)
    };
  }
}
