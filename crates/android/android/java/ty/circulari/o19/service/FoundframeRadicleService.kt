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
 * FoundframeRadicleService - Singleton service running the Radicle node
 * 
 * This service runs in a separate process (:foundframe) and provides
 * Binder IPC access to the o19-foundframe Rust code. It is sticky and
 * auto-restarts on crash.
 * 
 * Usage:
 * - Start: context.startService(Intent(context, FoundframeRadicleService::class.java))
 * - Bind: Not needed - clients use ServiceManager to get the binder directly
 */
class FoundframeRadicleService : Service() {
    
    companion object {
        private const val TAG = "FoundframeRadicle"
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "foundframe_radicle"
        
        init {
            System.loadLibrary("android")
        }
    }
    
    private external fun nativeStartService(radicleHome: String, alias: String)
    
    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Service creating in pid ${Process.myPid()}")
        
        // Create notification channel for foreground service
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Foundframe Radicle Node",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background service for o19 Radicle node"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
        
        // Start as foreground service
        startForeground(NOTIFICATION_ID, createNotification())
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "Service starting (startId=$startId)")
        
        // Start the Rust service in a background thread
        Thread {
            val radicleHome = getDir(".radicle", Context.MODE_PRIVATE).absolutePath
            val alias = intent?.getStringExtra("alias") ?: "android"
            
            Log.i(TAG, "Starting native service with alias: $alias")
            nativeStartService(radicleHome, alias)
            
            Log.w(TAG, "Native service exited unexpectedly!")
            // The native service blocks on the thread pool, so if we get here,
            // something went wrong. We should restart.
            stopSelf(startId)
        }.apply {
            name = "FoundframeService-Thread"
            start()
        }
        
        // STICKY = restart service if killed by system
        return START_STICKY
    }
    
    override fun onBind(intent: Intent): IBinder? {
        // Service is accessed via ServiceManager, not direct binding
        // This returns null as the binder is registered with ServiceManager
        // by the native code
        return null
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "Service destroying")
        // The native thread will be killed with the process
    }
    
    private fun createNotification(): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        
        return builder
            .setContentTitle("o19 Radicle Node")
            .setContentText("P2P node running in background")
            .setSmallIcon(android.R.drawable.ic_menu_share) // TODO: Custom icon
            .setOngoing(true)
            .build()
    }
}
