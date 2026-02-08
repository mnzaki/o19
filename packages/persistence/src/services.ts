/**
 * Service Interfaces
 * 
 * Business logic contracts for persistence services.
 */

import type { Post, AccumulatingPost, View, ViewFilters, InputType, Person } from './types.js';

// Post Service

export interface IPostService {
  create(post: AccumulatingPost): Promise<Post>;
  getById(id: string): Promise<Post | null>;
  getAll(filters?: PostServiceFilters): Promise<Post[]>;
  update(id: string, updates: Partial<Post>): Promise<void>;
  delete(id: string): Promise<void>;
  searchByKeyword(keyword: string): Promise<Post[]>;
  getByDateRange(from: Date, to: Date): Promise<Post[]>;
  count(): Promise<number>;
}

export interface PostServiceFilters {
  dateFrom?: Date;
  dateTo?: Date;
  keywords?: string[];
  mentionedPeople?: string[];
  hasMedia?: boolean;
  hasLinks?: boolean;
  hasPeople?: boolean;
  sortBy?: 'recent' | 'oldest';
  limit?: number;
  offset?: number;
}

// View Service

export interface IViewService {
  getAll(): Promise<View[]>;
  getById(id: string): Promise<View | null>;
  create(filters?: Partial<ViewFilters>): Promise<View>;
  update(id: string, updates: Partial<View>): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(indices: number[]): Promise<void>;
  getFeed(): Promise<View>;
  closeAllChildViews(): Promise<void>;
}

// Session Service

export interface ISessionService {
  // Foreground position
  getForegroundPosition(): Promise<number>;
  setForegroundPosition(position: number): Promise<void>;
  
  // Active input tab
  getActiveInput(): Promise<InputType>;
  setActiveInput(input: InputType): Promise<void>;
  
  // Scroll positions
  getFeedScrollPosition(): Promise<number>;
  setFeedScrollPosition(position: number): Promise<void>;
  
  getLastReadPostId(): Promise<string | null>;
  setLastReadPostId(postId: string | null): Promise<void>;
  
  // Input drafts
  getTextDraft(): Promise<string>;
  setTextDraft(draft: string): Promise<void>;
  
  getLinkDraft(): Promise<string>;
  setLinkDraft(draft: string): Promise<void>;
  
  getPersonDraft(): Promise<{ did: string; displayName: string; avatarUri?: string } | null>;
  setPersonDraft(draft: { did: string; displayName: string; avatarUri?: string } | null): Promise<void>;
  
  clearAllDrafts(): Promise<void>;
}

// Person Service

export interface IPersonService {
  search(query: string, limit?: number): Promise<Person[]>;
  getByDid(did: string): Promise<Person | null>;
  create(person: Omit<Person, 'createdAt'>): Promise<Person>;
  update(did: string, updates: Partial<Person>): Promise<void>;
  delete(did: string): Promise<void>;
  getAll(limit?: number): Promise<Person[]>;
}

// All together now

export interface IPersistenceServices {
  post: IPostService;
  view: IViewService;
  session: ISessionService;
  person: IPersonService;
};
