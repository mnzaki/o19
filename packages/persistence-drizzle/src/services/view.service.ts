/**
 * View Service
 *
 * Business logic for Views using Drizzle ORM.
 */

import { eq, asc, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { SortBy, View, ViewFilters } from '@repo/persistence';
import type { IViewService } from '@repo/persistence/services';
import { views } from '../schema.js';

export class ViewService implements IViewService {
  constructor(private db: BaseSQLiteDatabase<any, any>) {}

  async getAll(): Promise<View[]> {
    const results = await this.db.select().from(views).orderBy(asc(views.viewIndex));
    return results.map(r => this.toDomainView(r));
  }

  async getById(id: string): Promise<View | null> {
    const result = await this.db.select().from(views).where(eq(views.id, id)).limit(1);
    return result.length > 0 ? this.toDomainView(result[0]) : null;
  }

  async create(filters: Partial<ViewFilters> = {}): Promise<View> {
    const id = `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Get next index
    const countResult = await this.db.select({ count: sql<number>`COUNT(*)` }).from(views);
    const viewIndex = countResult[0]?.count ?? 0;

    const view: View = {
      id,
      index: viewIndex,
      filters: filters ?? {},
      sortBy: 'recent',
      createdAt: new Date()
    };

    await this.db.insert(views).values({
      id: view.id,
      viewIndex: viewIndex,
      filters: view.filters,
      sortBy: view.sortBy,
      label: view.label,
      createdAt: view.createdAt,
      isFeed: false
    });

    return view;
  }

  async update(id: string, updates: Partial<View>): Promise<void> {
    const updateData: Partial<typeof views.$inferInsert> = {};

    if (updates.filters) {
      updateData.filters = updates.filters;
    }
    if (updates.sortBy) {
      updateData.sortBy = updates.sortBy;
    }
    if (updates.label !== undefined) {
      updateData.label = updates.label;
    }
    if (updates.index !== undefined) {
      updateData.viewIndex = updates.index;
    }

    await this.db.update(views).set(updateData).where(eq(views.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(views).where(eq(views.id, id));

    // Reindex remaining views
    const allViews = await this.getAll();
    for (let i = 0; i < allViews.length; i++) {
      if (allViews[i].index !== i) {
        await this.update(allViews[i].id, { index: i });
      }
    }
  }

  async reorder(indices: number[]): Promise<void> {
    const allViews = await this.getAll();
    for (let newIndex = 0; newIndex < indices.length; newIndex++) {
      const oldIndex = indices[newIndex];
      if (allViews[oldIndex]) {
        await this.update(allViews[oldIndex].id, { index: newIndex });
      }
    }
  }

  async getFeed(): Promise<View> {
    const result = await this.db.select().from(views).where(eq(views.isFeed, true)).limit(1);

    if (result.length > 0) {
      return this.toDomainView(result[0]);
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

    await this.db.insert(views).values({
      id: feed.id,
      viewIndex: feed.index,
      filters: feed.filters,
      sortBy: feed.sortBy,
      label: feed.label,
      createdAt: feed.createdAt,
      isFeed: true
    });

    return feed;
  }

  async closeAllChildViews(): Promise<void> {
    await this.db.delete(views).where(eq(views.isFeed, false));
  }

  private toDomainView(row: typeof views.$inferSelect): View {
    return {
      id: row.id,
      index: row.viewIndex,
      filters: row.filters as ViewFilters,
      sortBy: row.sortBy as SortBy,
      label: row.label ?? undefined,
      createdAt: row.createdAt
    };
  }
}
