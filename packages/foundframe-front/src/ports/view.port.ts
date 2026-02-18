/**
 * View port - repository interface for View entity
 */

import { BasePort } from './base.port.js';
import type { View, CreateView, UpdateView, ViewFilters } from '../domain/entities/view.js';
import type { StreamEntry } from '../domain/entities/stream.js';

export interface ViewPort {
  /** Create a new view */
  create(data: CreateView): Promise<View>;
  
  /** Get by ID */
  getById(id: number): Promise<View | null>;
  
  /** Get all views */
  getAll(): Promise<View[]>;
  
  /** Update view */
  update(id: number, data: UpdateView): Promise<void>;
  
  /** Delete view (cannot delete TheStream™ or pinned) */
  delete(id: number): Promise<void>;
  
  /** Reorder views */
  reorder(viewIds: number[]): Promise<void>;
  
  /** Get TheStream™ view (View 0) */
  getTheStream(): Promise<View>;
  
  /** Query stream through this view's lens */
  queryStream(viewId: number, pagination?: { limit?: number; offset?: number }): Promise<StreamEntry[]>;
}

export abstract class ViewAdaptor extends BasePort implements ViewPort {
  create(_data: CreateView): Promise<View> {
    this.throwNotImplemented('ViewAdaptor.create');
  }
  
  getById(_id: number): Promise<View | null> {
    this.throwNotImplemented('ViewAdaptor.getById');
  }
  
  getAll(): Promise<View[]> {
    this.throwNotImplemented('ViewAdaptor.getAll');
  }
  
  update(_id: number, _data: UpdateView): Promise<void> {
    this.throwNotImplemented('ViewAdaptor.update');
  }
  
  delete(_id: number): Promise<void> {
    this.throwNotImplemented('ViewAdaptor.delete');
  }
  
  reorder(_viewIds: number[]): Promise<void> {
    this.throwNotImplemented('ViewAdaptor.reorder');
  }
  
  getTheStream(): Promise<View> {
    this.throwNotImplemented('ViewAdaptor.getTheStream');
  }
  
  queryStream(_viewId: number, _pagination?: { limit?: number; offset?: number }): Promise<StreamEntry[]> {
    this.throwNotImplemented('ViewAdaptor.queryStream');
  }
}
