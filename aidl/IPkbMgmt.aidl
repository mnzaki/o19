// IPkbMgmt.aidl
// Management: Personal Knowledge Base
//
// Manages the git-based Personal Knowledge Base (PKB) repositories.

package ty.circulari.o19;

/**
 * Management: PkbMgmt
 * 
 * The PKB is a collection of Radicle repositories that constitute
 * the user's personal knowledge. This management handles repository
 * lifecycle and basic PKB operations.
 */
interface IPkbMgmt {
    
    /** Create a new repository with the given name */
    boolean createRepository(String name);
    
    /** List all repositories in the PKB */
    String[] listRepositories();
    
    /** Get the default repository for stream content */
    String getDefaultRepository();
    
    /** Set the default repository */
    boolean setDefaultRepository(String name);
}
