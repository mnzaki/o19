/**
 * Node Management - Surface Imprint
 *
 * Handles the Radicle node lifecycle—startup, identity, and status.
 * The node is the fundamental unit of identity in the Radicle network.
 *
 * Reach: Private (Core only)
 *
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import { reach, Management, crud } from '@o19/spire-loom';

@reach('Private')
class NodeMgmt extends Management {
  // ========================================================================
  // CONSTANTS
  // ========================================================================

  DEFAULT_ALIAS = 'o19-node';
  MIN_ALIAS_LENGTH = 1;
  MAX_ALIAS_LENGTH = 32;

  // ========================================================================
  // NODE LIFECYCLE
  // ========================================================================

  /**
   * Get the unique node identifier (DID)
   */
  getNodeId(): string {
    throw new Error('Imprint only');
  }

  /**
   * Check if the Radicle node is currently running
   */
  isNodeRunning(): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Get the human-readable alias for this node
   */
  getNodeAlias(): string {
    throw new Error('Imprint only');
  }

  /**
   * Start the node with the given alias
   */
  startNode(alias: string): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Stop the node gracefully
   */
  stopNode(): void {
    throw new Error('Imprint only');
  }
}

/**
 * Node status information
 */
interface NodeStatus {
  nodeId: string;
  alias: string;
  isRunning: boolean;
  startedAt?: number;
  peersConnected: number;
  repositoriesHosted: number;
}

export { NodeMgmt };
