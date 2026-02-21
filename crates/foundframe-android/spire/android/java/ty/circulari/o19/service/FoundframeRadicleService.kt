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
    
    /** BookmarkMgmt.addBookmark */
    private external fun nativeAddbookmark(
        handle: Long,
                url: String,
                title: String,
                notes: String
        
    ): String
    
    /** BookmarkMgmt.getBookmark */
    private external fun nativeGetbookmark(
        handle: Long,
                pkbUrl: String
        
    ): String
    
    /** BookmarkMgmt.listBookmarks */
    private external fun nativeListbookmarks(
        handle: Long,
                directory: String
        
    ): List<String>
    
    /** BookmarkMgmt.deleteBookmark */
    private external fun nativeDeletebookmark(
        handle: Long,
                pkbUrl: String
        
    ): Boolean
    
    /** ContentMgmt.addMediaLink */
    private external fun nativeAddmedialink(
        handle: Long,
                directory: String,
                url: String,
                title: String,
                mimeType: String,
                subpath: String
        
    ): String
    
    /** ContentMgmt.addBookmark */
    private external fun nativeAddbookmark(
        handle: Long,
                url: String,
                title: String,
                notes: String
        
    ): String
    
    /** ContentMgmt.addPost */
    private external fun nativeAddpost(
        handle: Long,
                content: String,
                title: String
        
    ): String
    
    /** ContentMgmt.addPerson */
    private external fun nativeAddperson(
        handle: Long,
                displayName: String,
                handle: String
        
    ): String
    
    /** ContentMgmt.addConversation */
    private external fun nativeAddconversation(
        handle: Long,
                conversationId: String,
                title: String
        
    ): String
    
    /** DeviceMgmt.generatePairingCode */
    private external fun nativeGeneratepairingcode(
        handle: Long
        
    ): String
    
    /** DeviceMgmt.confirmPairing */
    private external fun nativeConfirmpairing(
        handle: Long,
                deviceId: String,
                code: String
        
    ): Boolean
    
    /** DeviceMgmt.unpairDevice */
    private external fun nativeUnpairdevice(
        handle: Long,
                deviceId: String
        
    ): Unit
    
    /** DeviceMgmt.listPairedDevices */
    private external fun nativeListpaireddevices(
        handle: Long
        
    ): List<String>
    
    /** DeviceMgmt.followDevice */
    private external fun nativeFollowdevice(
        handle: Long,
                deviceId: String
        
    ): Boolean
    
    /** DeviceMgmt.unfollowDevice */
    private external fun nativeUnfollowdevice(
        handle: Long,
                deviceId: String
        
    ): Unit
    
    /** DeviceMgmt.listFollowers */
    private external fun nativeListfollowers(
        handle: Long
        
    ): List<String>
    
    /** DeviceMgmt.isFollowing */
    private external fun nativeIsfollowing(
        handle: Long,
                deviceId: String
        
    ): Boolean
    
    /** EventMgmt.subscribeEvents */
    private external fun nativeSubscribeevents(
        handle: Long,
                callback: String
        
    ): Unit
    
    /** EventMgmt.unsubscribeEvents */
    private external fun nativeUnsubscribeevents(
        handle: Long,
                callback: String
        
    ): Unit
    
    /** EventMgmt.supportsEvents */
    private external fun nativeSupportsevents(
        handle: Long
        
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
     * BookmarkMgmt.addBookmark
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun addBookmark(
        url: String, 
        title: String, 
        notes: String): String {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeAddbookmark(nativeHandle, url, title, notes)
    }
    
    /**
     * BookmarkMgmt.getBookmark
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun getBookmark(
        pkbUrl: String): String {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeGetbookmark(nativeHandle, pkbUrl)
    }
    
    /**
     * BookmarkMgmt.listBookmarks
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun listBookmarks(
        directory: String): List<String> {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeListbookmarks(nativeHandle, directory)
    }
    
    /**
     * BookmarkMgmt.deleteBookmark
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun deleteBookmark(
        pkbUrl: String): Boolean {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeDeletebookmark(nativeHandle, pkbUrl)
    }
    
    /**
     * ContentMgmt.addMediaLink
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun addMediaLink(
        directory: String, 
        url: String, 
        title: String, 
        mimeType: String, 
        subpath: String): String {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeAddmedialink(nativeHandle, directory, url, title, mimeType, subpath)
    }
    
    /**
     * ContentMgmt.addBookmark
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun addBookmark(
        url: String, 
        title: String, 
        notes: String): String {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeAddbookmark(nativeHandle, url, title, notes)
    }
    
    /**
     * ContentMgmt.addPost
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun addPost(
        content: String, 
        title: String): String {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeAddpost(nativeHandle, content, title)
    }
    
    /**
     * ContentMgmt.addPerson
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun addPerson(
        displayName: String, 
        handle: String): String {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeAddperson(nativeHandle, displayName, handle)
    }
    
    /**
     * ContentMgmt.addConversation
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun addConversation(
        conversationId: String, 
        title: String): String {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeAddconversation(nativeHandle, conversationId, title)
    }
    
    /**
     * DeviceMgmt.generatePairingCode
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun generatePairingCode(): String {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeGeneratepairingcode(nativeHandle)
    }
    
    /**
     * DeviceMgmt.confirmPairing
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun confirmPairing(
        deviceId: String, 
        code: String): Boolean {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeConfirmpairing(nativeHandle, deviceId, code)
    }
    
    /**
     * DeviceMgmt.unpairDevice
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun unpairDevice(
        deviceId: String): Unit {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeUnpairdevice(nativeHandle, deviceId)
    }
    
    /**
     * DeviceMgmt.listPairedDevices
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun listPairedDevices(): List<String> {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeListpaireddevices(nativeHandle)
    }
    
    /**
     * DeviceMgmt.followDevice
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun followDevice(
        deviceId: String): Boolean {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeFollowdevice(nativeHandle, deviceId)
    }
    
    /**
     * DeviceMgmt.unfollowDevice
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun unfollowDevice(
        deviceId: String): Unit {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeUnfollowdevice(nativeHandle, deviceId)
    }
    
    /**
     * DeviceMgmt.listFollowers
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun listFollowers(): List<String> {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeListfollowers(nativeHandle)
    }
    
    /**
     * DeviceMgmt.isFollowing
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun isFollowing(
        deviceId: String): Boolean {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeIsfollowing(nativeHandle, deviceId)
    }
    
    /**
     * EventMgmt.subscribeEvents
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun subscribeEvents(
        callback: String): Unit {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeSubscribeevents(nativeHandle, callback)
    }
    
    /**
     * EventMgmt.unsubscribeEvents
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun unsubscribeEvents(
        callback: String): Unit {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeUnsubscribeevents(nativeHandle, callback)
    }
    
    /**
     * EventMgmt.supportsEvents
     * 
     * This method locks the service handle on the Rust side, calls the 
     * underlying core method, and returns the result after unlocking.
     */
    fun supportsEvents(): Boolean {
        check(nativeHandle != 0L) { "Service not initialized" }
        return nativeSupportsevents(nativeHandle)
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
