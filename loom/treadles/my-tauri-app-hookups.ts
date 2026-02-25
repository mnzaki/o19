/**
 * MyTauriApp Hookup Treadle
 *
 * This treadle ONLY applies hookups to MyTauriApp - no code generation.
 * Adds integration test module to verify the spire-foundframe integration.
 */

import { defineTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export const myTauriAppHookupTreadle = defineTreadle({
  name: 'my-tauri-app-hookups',

  // Hookups-only treadle - filter out all methods
  methods: {
    filter: () => false
  },

  // Minimal output - just a marker file
  outputs: [
    {
      template: 'my-tauri-app/spire-marker.txt.ejs',
      path: 'spire/MARKER.txt',
      language: 'text'
    }
  ],

  // Hookups to wire spire-generated code into MyTauriApp
  hookups: [
    // Rust: Add integration test module (cfg(test) means only compiled for tests)
    {
      path: 'src-tauri/src/lib.rs',
      moduleDeclarations: [
        { name: 'spire_integration_test', path: 'spire_integration_test.rs', pub: false, cfg: 'test' }
      ]
    }
  ]
});
