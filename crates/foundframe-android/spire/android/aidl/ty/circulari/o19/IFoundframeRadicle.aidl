// IFoundframeRadicle.aidl
// Generated AIDL interface for foundframe service

package ty.circulari.o19;

import ty.circulari.o19.IEventCallback;

interface IFoundframeRadicle {

    // BookmarkMgmt.addBookmark
    String addBookmark(String url, String title, String notes);

    // BookmarkMgmt.getBookmark
    String getBookmark(String pkbUrl);

    // BookmarkMgmt.listBookmarks
    String[] listBookmarks(String directory);

    // BookmarkMgmt.deleteBookmark
    boolean deleteBookmark(String pkbUrl);

    // DeviceMgmt.generatePairingCode
    String generatePairingCode();

    // DeviceMgmt.confirmPairing
    boolean confirmPairing(String deviceId, String code);

    // DeviceMgmt.unpairDevice
    void unpairDevice(String deviceId);

    // DeviceMgmt.listPairedDevices
    String[] listPairedDevices();

    // DeviceMgmt.followDevice
    boolean followDevice(String deviceId);

    // DeviceMgmt.unfollowDevice
    void unfollowDevice(String deviceId);

    // DeviceMgmt.listFollowers
    String[] listFollowers();

    // DeviceMgmt.isFollowing
    boolean isFollowing(String deviceId);

    // EventMgmt.subscribeEvents
    void subscribeEvents(String callback);

    // EventMgmt.unsubscribeEvents
    void unsubscribeEvents(String callback);

    // EventMgmt.supportsEvents
    boolean supportsEvents();

}
