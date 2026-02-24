/**
 * Custom API Treadle (Example)
 * 
 * A custom generator for API endpoints.
 * 
 * Place this file in your project's loom/treadles/ directory
 * to extend the loom with custom generation logic.
 */

import { definePlatformWrapperTreadle } from '@o19/spire-loom/machinery';

export default definePlatformWrapperTreadle({
  name: 'custom-api',
  platform: 'tauri',
  phase: 'generation',
  
  async generate(context) {
    // Custom generation logic
    // Access spiral metadata via context.spiral
    // Access management methods via context.management
    
    return {
      files: [
        // Return generated files
      ]
    };
  }
});

export const helpers = {
  formatRoute(path: string): string {
    return path.replace(/\//g, '_');
  }
};
