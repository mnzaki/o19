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
        private const val TAG = "O19-ANDROID"
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "foundframe_radicle"
        
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
    
    private external fun nativeStartService(radicleHome: String, alias: String)
    
    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "[FoundframeRadicleService] Service creating in pid ${Process.myPid()}")
        Log.i(TAG, "[FoundframeRadicleService] Process name: ${applicationInfo.processName}")
        
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
            Log.d(TAG, "[FoundframeRadicleService] Notification channel created")
        }
        
        // Start as foreground service
        startForeground(NOTIFICATION_ID, createNotification())
        Log.i(TAG, "[FoundframeRadicleService] Started as foreground service")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "[FoundframeRadicleService] Service starting (startId=$startId, flags=$flags)")
        
        val radicleHome = getDir(".radicle", Context.MODE_PRIVATE).absolutePath
        val alias = intent?.getStringExtra("alias") ?: "android"
        
        Log.i(TAG, "[FoundframeRadicleService] Radicle home: $radicleHome")
        Log.i(TAG, "[FoundframeRadicleService] Using alias: $alias")
        
        // Check if directory exists
        val radicleDir = java.io.File(radicleHome)
        if (!radicleDir.exists()) {
            Log.i(TAG, "[FoundframeRadicleService] Creating radicle home directory")
            radicleDir.mkdirs()
        }
        Log.i(TAG, "[FoundframeRadicleService] Radicle home exists: ${radicleDir.exists()}, writable: ${radicleDir.canWrite()}")
        
        // Start the Rust service in a background thread
        Thread {
            Log.i(TAG, "[FoundframeRadicleService] Native service thread starting")
            
            try {
                Log.i(TAG, "[FoundframeRadicleService] About to call nativeStartService...")
                nativeStartService(radicleHome, alias)
                Log.w(TAG, "[FoundframeRadicleService] Native service exited (this shouldn't happen normally)")
            } catch (e: UnsatisfiedLinkError) {
                Log.e(TAG, "[FoundframeRadicleService] Native method not found - library not loaded or symbol missing: ${e.message}", e)
            } catch (e: Exception) {
                Log.e(TAG, "[FoundframeRadicleService] Native service crashed: ${e.message}", e)
            } catch (e: Error) {
                Log.e(TAG, "[FoundframeRadicleService] Native service error (not exception): ${e.message}", e)
            }
            
            // The native service blocks on the thread pool, so if we get here,
            // something went wrong. We should restart.
            Log.w(TAG, "[FoundframeRadicleService] Stopping service due to native exit")
            stopSelf(startId)
        }.apply {
            name = "FoundframeService-Thread-$startId"
            start()
        }
        
        Log.i(TAG, "[FoundframeRadicleService] Native service thread started")
        
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
