/**
 * Drizzle implementation of ViewPort
 */

import { eq, asc, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { ViewAdaptor } from '@o19/foundframe/ports';
import type { ViewPort } from '@o19/foundframe/ports';
import type { View, CreateView, UpdateView } from '@o19/foundframe/domain';
import type { StreamEntry } from '@o19/foundframe/domain';
import { view } from '../schema/index.js';
import type { DrizzleStreamAdaptor } from './stream.adaptor.js';

export class DrizzleViewAdaptor extends ViewAdaptor implements ViewPort {
  constructor(
    private db: BaseSQLiteDatabase<any, any>,
    private streamAdaptor?: DrizzleStreamAdaptor
  ) {
    super();
  }

  async create(data: CreateView): Promise<View> {
    const countResult = await this.db.select({ count: sql<number>`COUNT(*)` }).from(view);
    const viewIndex = countResult[0]?.count ?? 0;

    const result = await this.db.insert(view).values({
      viewIndex: data.index ?? viewIndex,
      label: data.label,
      badge: data.badge,
      filters: data.filters,
      sortBy: data.sortBy,
      isPinned: data.isPinned,
      isThestream: data.isTheStream,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return this.toDomain(result[0]);
  }

  async getById(id: number): Promise<View | null> {
    const result = await this.db.select().from(view).where(eq(view.id, id)).limit(1);
    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async getAll(): Promise<View[]> {
    const results = await this.db.select().from(view).orderBy(asc(view.viewIndex));
    return results.map(r => this.toDomain(r));
  }

  async update(id: number, data: UpdateView): Promise<void> {
    const updateData: Partial<typeof view.$inferInsert> = {};
    
    if (data.filters) updateData.filters = data.filters;
    if (data.sortBy) updateData.sortBy = data.sortBy;
    if (data.label !== undefined) updateData.label = data.label;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.index !== undefined) updateData.viewIndex = data.index;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;

    updateData.updatedAt = new Date();

    await this.db.update(view).set(updateData).where(eq(view.id, id));
  }

  async delete(id: number): Promise<void> {
    const viewToDelete = await this.getById(id);
    if (viewToDelete?.isTheStream) {
      throw new Error('Cannot delete TheStream view');
    }
    if (viewToDelete?.isPinned) {
      throw new Error('Cannot delete pinned view');
    }

    await this.db.delete(view).where(eq(view.id, id));

    // Reindex remaining views
    const allViews = await this.getAll();
    for (let i = 0; i < allViews.length; i++) {
      if (allViews[i].index !== i) {
        await this.update(allViews[i].id, { index: i });
      }
    }
  }

  async reorder(viewIds: number[]): Promise<void> {
    const allViews = await this.getAll();
    for (let newIndex = 0; newIndex < viewIds.length; newIndex++) {
      const viewToMove = allViews.find(v => v.id === viewIds[newIndex]);
      if (viewToMove) {
        await this.update(viewToMove.id, { index: newIndex });
      }
    }
  }

  async getTheStream(): Promise<View> {
    const result = await this.db.select().from(view).where(eq(view.isThestream, true)).limit(1);

    if (result.length > 0) {
      return this.toDomain(result[0]);
    }

    // Create TheStream (View 0)
    const thestream = await this.db.insert(view).values({
      viewIndex: 0,
      label: 'Stream',
      badge: 'FEED',
      filters: {},
      sortBy: 'recent',
      isPinned: true,
      isThestream: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return this.toDomain(thestream[0]);
  }

  async queryStream(viewId: number, pagination?: { limit?: number; offset?: number }): Promise<StreamEntry[]> {
    if (!this.streamAdaptor) {
      throw new Error('StreamAdaptor not provided to ViewAdaptor');
    }

    const viewConfig = await this.getById(viewId);
    if (!viewConfig) {
      throw new Error('View not found');
    }

    return this.streamAdaptor.query({
      dateRange: viewConfig.filters.dateRange,
      chunkTypes: viewConfig.filters.chunkTypes,
      sortBy: viewConfig.sortBy,
      pagination,
    });
  }

  private toDomain(row: typeof view.$inferSelect): View {
    return {
      id: row.id,
      index: row.viewIndex,
      label: row.label ?? undefined,
      badge: row.badge,
      filters: row.filters as View['filters'],
      sortBy: row.sortBy as View['sortBy'],
      isPinned: row.isPinned,
      isTheStream: row.isThestream,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? undefined,
    };
  }
}
