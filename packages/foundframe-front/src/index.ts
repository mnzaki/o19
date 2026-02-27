/**
 * foundframe - Foundational Framework for o19 apps
 *
 * Domain-driven architecture with clear separation:
 * - Domain: Entities, value objects, domain services
 * - Ports: Repository interfaces (what the domain needs)
 * - Services: Business logic (uses ports)
 *
 * Infrastructure implementations (adapters) are in separate packages:
 * - @o19/foundframe-drizzle: Drizzle ORM implementation
 * - @o19/schema: Database schema definitions
 */

// ============================================
// Domain Values
// ============================================

export type * from './domain/values/address.js';
export * from './domain/values/address.js';

export type * from './domain/values/content.js';
export * from './domain/values/content.js';

export type * from './domain/values/common.js';

// ============================================
// Domain Entities
// ============================================

export type * from './domain/entities/index.js';
export * from './domain/entities/index.js';

export * from './ports/index.js';
export type * from './ports/index.js';

// ============================================
// Domain Services
// ============================================

export * from './services/index.js';
export type * from './services/index.js';

// ============================================
// Foundframe Info
// ============================================

export const FOUNDFRAME_VERSION = '0.1.0';
export const FOUNDFRAME_NAME = '@o19/foundframe-front';
