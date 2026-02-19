// IContentMgmt.aidl
// Management: Content Creation
//
// All content creation operations for TheStream™.

package ty.circulari.o19;

/**
 * Management: ContentMgmt
 * 
 * The content management interface for adding items to TheStream™.
 * Each method returns a content-addressed reference (PKB URL) to the
 * created content.
 * 
 * Entity order: Media → Bookmark → Post → Person → Conversation
 */
interface IContentMgmt {
    
    // ==================== Media (raw bits) ====================
    
    /**
     * Add a media link to the stream.
     * @param directory Base directory for media storage
     * @param url Source URL of the media
     * @param title Optional title
     * @param mimeType MIME type (e.g., "image/png")
     * @param subpath Optional subpath within directory
     * @return PKB URL reference to the created media link
     */
    String addMediaLink(String directory, String url, String title, String mimeType, String subpath);
    
    // ==================== Bookmark (URL + context) ====================
    
    /**
     * Add a bookmark to the stream.
     * @param url The bookmarked URL
     * @param title Optional title
     * @param notes Optional notes
     * @return PKB URL reference to the created bookmark
     */
    String addBookmark(String url, String title, String notes);
    
    // ==================== Post (authored, composed) ====================
    
    /**
     * Add a post to the stream.
     * @param content The markdown/text content
     * @param title Optional title (can be null)
     * @return PKB URL reference to the created post
     */
    String addPost(String content, String title);
    
    // ==================== Person (identity) ====================
    
    /**
     * Add a person to the stream.
     * @param displayName Human-readable name
     * @param handle Optional handle/identifier
     * @return PKB URL reference to the created person
     */
    String addPerson(String displayName, String handle);
    
    // ==================== Conversation (relational) ====================
    
    /**
     * Add a conversation to the stream.
     * @param conversationId Unique conversation identifier
     * @param title Optional conversation title
     * @return PKB URL reference to the created conversation
     */
    String addConversation(String conversationId, String title);
}
