// IFoundframeRadicle.aidl
// Generated AIDL interface for foundframe service

package ty.circulari.o19;

import ty.circulari.o19.IEventCallback;

interface IFoundframeRadicle {

    // BookmarkMgmt.bookmark_addBookmark
    void bookmark_add_bookmark(String url, String title, String notes);

    // BookmarkMgmt.bookmark_getBookmarkByUrl
    String bookmark_get_bookmark_by_url(String pkbUrl);

    // BookmarkMgmt.bookmark_listBookmarks
    String[] bookmark_list_bookmarks(String directory);

    // BookmarkMgmt.bookmark_deleteBookmark
    boolean bookmark_delete_bookmark(String pkbUrl);

    // DeviceMgmt.device_generatePairingCode
    String device_generate_pairing_code();

    // DeviceMgmt.device_confirmPairing
    boolean device_confirm_pairing(String deviceId, String code);

    // DeviceMgmt.device_unpairDevice
    void device_unpair_device(String deviceId);

    // DeviceMgmt.device_listPairedDevices
    String[] device_list_paired_devices();

    // DeviceMgmt.device_followDevice
    boolean device_follow_device(String deviceId);

    // DeviceMgmt.device_unfollowDevice
    void device_unfollow_device(String deviceId);

    // DeviceMgmt.device_listFollowers
    String[] device_list_followers();

    // DeviceMgmt.device_isFollowing
    boolean device_is_following(String deviceId);

}
