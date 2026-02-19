// INodeMgmt.aidl
// Management: Node Lifecycle
//
// Handles the Radicle node lifecycle—startup, identity, and status.

package ty.circulari.o19;

/**
 * Management: NodeMgmt
 * 
 * The node is the fundamental unit of identity in the Radicle network.
 * This management handles node's existence, identity, and runtime state.
 */
interface INodeMgmt {
    
    /** Get the unique node identifier (DID) */
    String getNodeId();
    
    /** Check if the Radicle node is currently running */
    boolean isNodeRunning();
    
    /** Get the human-readable alias for this node */
    String getNodeAlias();
    
    /** Start the node with the given alias */
    boolean startNode(String alias);
    
    /** Stop the node gracefully */
    void stopNode();
}
