/**
 * App Hookup Treadle - Reusable across Tauri apps
 *
 * This treadle applies hookups to any Tauri app - no code generation.
 * Configurable via warpData to specify app name and settings.
 */

import { declareTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export interface AppHookupConfig {
  appName: string;
  template?: string;
  enableIntegrationTests?: boolean;
}

export const appHookupTreadle = declareTreadle({
  name: 'app-hookups',

  // Hookups-only treadle - filter out all methods
  methods: {
    filter: () => false
  },

  // Minimal output - just a marker file
  outputs: [
    {
      template: 'tauri/spire-marker.txt.ejs',
      path: 'spire/MARKER.txt',
      language: 'text'
    }
  ],

  // Hookups to wire spire-generated code into the app
  hookups: [
    // Rust: Add integration test module (cfg(test) means only compiled for tests)
    {
      path: 'src-tauri/src/lib.rs',
      moduleDeclarations: [
        {
          name: 'spire_integration_test',
          path: 'spire_integration_test.rs',
          pub: false,
          cfg: 'test'
        }
      ]
    },
    
    /**
     * build.rs variable fix for foundframe-android
     * 
     * The foundframe-android crate's build.rs needs to look for AIDL files
     * in the correct location (spire/android/aidl instead of ./android/aidl).
     * 
     * This hookup uses DEEP OBJECT MODE to declare the variable:
     * - name: The variable name to match
     * - type: The Rust type for type checking
     * - value: The exact Rust code for the initial value
     * - mutable: Whether to add 'mut' keyword
     * - spireManaged: Wrap in SPIRE-LOOM markers for tracking
     * 
     * If the variable exists with a non-spire value, the hookup will ERROR
     * to prevent silently overwriting manual code.
     */
    {
      path: '../../o19/crates/foundframe-android/build.rs',
      variables: [
        {
          name: 'aidl_dir',
          type: 'PathBuf',
          value: 'PathBuf::from("spire/android/aidl")',
          mutable: false,
          spireManaged: true,
          description: 'AIDL directory path for foundframe-android build.rs'
        }
      ]
    }
  ]
});
