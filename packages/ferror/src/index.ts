/**
 * @o19/ferror
 * 
 * 🦀 The Ferris Error System
 * 
 * Contextual error handling with architectural awareness.
 * 
 * The crab carries error context carefully through the stack,
 * never dropping the context ball.
 */

export { ferroringModule } from './module.js';
export { Ferror, isFerror } from './Ferror.js';
export type * from './types.js';
