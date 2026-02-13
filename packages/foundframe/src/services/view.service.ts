/**
 * View service
 * Domain service for managing views (lenses on TheStream™)
 */

import { ViewAdaptor, type ViewPort } from '../ports/view.port.js';
import type { View, CreateView, UpdateView } from '../domain/entities/view.js';
import type { StreamEntry } from '../domain/entities/stream.js';

export class ViewService extends ViewAdaptor implements ViewPort {
  constructor(private adaptor: ViewPort) {
    super();
  }

  create(data: CreateView): Promise<View> {
    return this.adaptor.create(data);
  }

  getById(id: number): Promise<View | null> {
    return this.adaptor.getById(id);
  }

  getAll(): Promise<View[]> {
    return this.adaptor.getAll();
  }

  update(id: number, data: UpdateView): Promise<void> {
    return this.adaptor.update(id, data);
  }

  delete(id: number): Promise<void> {
    return this.adaptor.delete(id);
  }

  reorder(viewIds: number[]): Promise<void> {
    return this.adaptor.reorder(viewIds);
  }

  getTheStream(): Promise<View> {
    return this.adaptor.getTheStream();
  }

  queryStream(viewId: number, pagination?: { limit?: number; offset?: number }): Promise<StreamEntry[]> {
    return this.adaptor.queryStream(viewId, pagination);
  }
}
