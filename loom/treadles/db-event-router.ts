/**
 * DbEventRouterTreadle - Custom treadle for foundframe
 * 
 * TEMPORARILY DISABLED while we focus on core DbActor generation.
 * Will be restored after DbActor is fully working.
 */

import { defineTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export const dbEventRouterTreadle = defineTreadle({
  name: 'db-event-router',

  methods: {
    filter: 'core',
    pipeline: []
  },

  // No outputs or patches - disabled for now
  outputs: [() => []],
  patches: [() => []]
});
