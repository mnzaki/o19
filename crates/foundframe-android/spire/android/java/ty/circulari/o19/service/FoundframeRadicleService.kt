package ty.circulari.o19.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Process
import android.util.Log

/**
 * FoundframeRadicleService - Generated foreground service
 * 
 * This service runs in a separate process and provides JNI access to the 
 * Rust core library. The native service handle is managed internally.
 */
class FoundframeRadicleService : Service() {
    
    companion object {
        private const val TAG = "FOUNDFRAMERADICLESERVICE"
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "foundframeradicleservice"
        
        init {
            try {
                Log.i(TAG, "[FoundframeRadicleService] Loading native library...")
                System.loadLibrary("android")
                Log.i(TAG, "[FoundframeRadicleService] Native library loaded successfully")
            } catch (e: Throwable) {
                Log.e(TAG, "[FoundframeRadicleService] FAILED to load native library: ${e.message}", e)
            }
        }
    }
    
    /** 
     * Native handle to the Rust service instance.
     * This is an opaque pointer - the actual Rust object lives in native memory.
     */
    private var nativeHandle: Long = 0
    
    /** Start the native service - returns a handle to the service instance */
    private external fun nativeStartService(homeDir: String, alias: String): Long
    
    /** Stop the native service and release the handle */
    private external fun nativeStopService(handle: Long)
    
    /** BookmarkMgmt.bookmark_addBookmark */
    private external fun nativeBookmarkAddBookmark(
        handle: Long,
                url: String,
                title: String,
                notes: String
        
    ): Unit
    
    /** BookmarkMgmt.bookmark_getBookmarkByUrl */
    private external fun nativeBookmarkGetBookmarkByUrl(
        handle: Long,
                pkbUrl: String
        
    ): String
    
    /** BookmarkMgmt.bookmark_listBookmarks */
    private external fun nativeBookmarkListBookmarks(
        handle: Long,
                directory: String
        
    ): List<String>
    
    /** BookmarkMgmt.bookmark_deleteBookmark */
    private external fun nativeBookmarkDeleteBookmark(
        handle: Long,
                pkbUrl: String
        
    ): Boolean
    
    /** DeviceMgmt.device_generatePairingCode */
    private external fun nativeDeviceGeneratePairingCode(
        handle: Long
        
    ): String
    
    /** DeviceMgmt.device_confirmPairing */
    private external fun nativeDeviceConfirmPairing(
        handle: Long,
                deviceId: String,
                code: String
        
    ): Boolean
    
    /** DeviceMgmt.device_unpairDevice */
    private external fun nativeDeviceUnpairDevice(
        handle: Long,
                deviceId: String
        
    ): Unit
    
    /** DeviceMgmt.device_listPairedDevices */
    private external fun nativeDeviceListPairedDevices(
        handle: Long
        
    ): List<String>
    
    /** DeviceMgmt.device_followDevice */
    private external fun nativeDeviceFollowDevice(
        handle: Long,
                deviceId: String
        
    ): Boolean
    
    /** DeviceMgmt.device_unfollowDevice */
    private external fun nativeDeviceUnfollowDevice(
        handle: Long,
                deviceId: String
        
    ): Unit
    
    /** DeviceMgmt.device_listFollowers */
    private external fun nativeDeviceListFollowers(
        handle: Long
        
    ): List<String>
    
    /** DeviceMgmt.device_isFollowing */
    private external fun nativeDeviceIsFollowing(
        handle: Long,
                deviceId: String
        
    ): Boolean
    
    
    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "[FoundframeRadicleService] Service creating in pid ${Process.myPid()}")
        
        // Create notification channel for foreground service
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "FoundframeRadicleService",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background service for foundframe"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
        
        // Start as foreground service
        startForeground(NOTIFICATION_ID, createNotification())
        Log.i(TAG, "[FoundframeRadicleService] Started as foreground service")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "[FoundframeRadicleService] Service starting (startId=$startId)")
        
        val homeDir = getDir(".foundframe", Context.MODE_PRIVATE).absolutePath
        val alias = intent?.getStringExtra("alias") ?: "android"
        
        // Start the native service in a background thread
        Thread {
            try {
                nativeHandle = nativeStartService(homeDir, alias)
                if (nativeHandle < 0) {
                    Log.e(TAG, "[FoundframeRadicleService] Native service failed to start")
                    stopSelf(startId)
                    return@Thread
                }
                
                Log.i(TAG, "[FoundframeRadicleService] Native service started with handle=$nativeHandle")
                
                // Service keeps running until explicitly stopped
                // The Rust core runs its own event loop
                Thread.currentThread().join()
                
                Log.w(TAG, "[FoundframeRadicleService] Native service thread exited unexpectedly")
            } catch (e: Exception) {
                Log.e(TAG, "[FoundframeRadicleService] Native service crashed: ${e.message}", e)
            } finally {
                if (nativeHandle != 0L) {
                    nativeStopService(nativeHandle)
                }
                nativeHandle = 0
                stopSelf(startId)
            }
        }.apply {
            name = "FoundframeRadicleService-Thread-$startId"
            start()
        }
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent): IBinder? {
        // This is a started service, not a bound service
        return null
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "Service destroying")
        if (nativeHandle != 0L) {
            nativeStopService(nativeHandle)
            nativeHandle = 0
        }
    }
    
    // ==========================================================================
    // Public API - These methods wrap the native JNI calls
    // 
    // IMPORTANT: These methods must be called from a background thread!
    // The service handle is locked on the Rust side during each call.
    // ==========================================================================
    
    /**
     * BookmarkMgmt.bookmark_addBookmark
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun bookmark_add_bookmark(
        url: String, 
        title: String, 
        notes: String): Unit {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeBookmarkAddBookmark(nativeHandle, url, title, notes)
    }
    
    /**
     * BookmarkMgmt.bookmark_getBookmarkByUrl
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun bookmark_get_bookmark_by_url(
        pkbUrl: String): String {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeBookmarkGetBookmarkByUrl(nativeHandle, pkbUrl)
    }
    
    /**
     * BookmarkMgmt.bookmark_listBookmarks
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun bookmark_list_bookmarks(
        directory: String): List<String> {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeBookmarkListBookmarks(nativeHandle, directory)
    }
    
    /**
     * BookmarkMgmt.bookmark_deleteBookmark
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun bookmark_delete_bookmark(
        pkbUrl: String): Boolean {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeBookmarkDeleteBookmark(nativeHandle, pkbUrl)
    }
    
    /**
     * DeviceMgmt.device_generatePairingCode
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun device_generate_pairing_code(): String {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeDeviceGeneratePairingCode(nativeHandle)
    }
    
    /**
     * DeviceMgmt.device_confirmPairing
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun device_confirm_pairing(
        deviceId: String, 
        code: String): Boolean {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeDeviceConfirmPairing(nativeHandle, deviceId, code)
    }
    
    /**
     * DeviceMgmt.device_unpairDevice
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun device_unpair_device(
        deviceId: String): Unit {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeDeviceUnpairDevice(nativeHandle, deviceId)
    }
    
    /**
     * DeviceMgmt.device_listPairedDevices
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun device_list_paired_devices(): List<String> {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeDeviceListPairedDevices(nativeHandle)
    }
    
    /**
     * DeviceMgmt.device_followDevice
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun device_follow_device(
        deviceId: String): Boolean {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeDeviceFollowDevice(nativeHandle, deviceId)
    }
    
    /**
     * DeviceMgmt.device_unfollowDevice
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun device_unfollow_device(
        deviceId: String): Unit {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeDeviceUnfollowDevice(nativeHandle, deviceId)
    }
    
    /**
     * DeviceMgmt.device_listFollowers
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun device_list_followers(): List<String> {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeDeviceListFollowers(nativeHandle)
    }
    
    /**
     * DeviceMgmt.device_isFollowing
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun device_is_following(
        deviceId: String): Boolean {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeDeviceIsFollowing(nativeHandle, deviceId)
    }
    
    
    private fun createNotification(): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        
        return builder
            .setContentTitle("foundframe Service")
            .setContentText("Running in background")
            .setSmallIcon(android.R.drawable.ic_menu_share)
            .setOngoing(true)
            .build()
    }
}
