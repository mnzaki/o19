/**
 * spire-loom CLI exports
 * 
 * Public API for programmatic use of the CLI components.
 */

// The Dressing (Hybrid - Runtime + Regex)
export {
  DressingService,
  dressingService,
  type Dressing,
  type DressingOptions,
  type RuntimeSpiral,
  type RuntimeLink,
  type RuntimeReach,
  type DressingChanges,
  type DiscoveredTreadle,
  type Bobbin
} from './dressing/service.js';

export { DressingEditor } from './dressing/editor.js';

// Menus
export { MainMenu } from './menus/main.js';
export { TreadleForgeMenu } from './menus/treadle-forge.js';

// MUD Mode
export { MudMode } from './mud/mode.js';
