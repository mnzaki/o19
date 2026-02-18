package ty.circulari.o19.service

import android.content.Context
import android.content.Intent
import android.os.Process
import android.util.Log

/**
 * FoundframeRadicleClient - Helper for connecting to the singleton service
 * 
 * This class provides a simple Java/Kotlin API for apps that want to use
 * the FoundframeRadicle service. The actual IPC happens via rsbinder
 * (ServiceManager lookup), but this handles:
 * - Ensuring the service is started
 * - Providing high-level convenience methods
 * 
 * Usage:
 * ```kotlin
 * val client = FoundframeRadicleClient(context)
 * if (client.ensureStarted()) {
 *     // Use the service via rsbinder
 * }
 * ```
 */
class FoundframeRadicleClient(private val context: Context) {
    
    companion object {
        private const val TAG = "O19-ANDROID"
        
        init {
            System.loadLibrary("android")
        }
        
        /**
         * Check if the service is currently running
         */
        @JvmStatic
        external fun isServiceRunning(): Boolean
        
        /**
         * Start the service with the given alias
         */
        @JvmStatic
        fun startService(context: Context, alias: String = "android") {
            val intent = Intent(context, FoundframeRadicleService::class.java).apply {
                putExtra("alias", alias)
            }
            context.startService(intent)
        }
        
        /**
         * Stop the service
         */
        @JvmStatic
        fun stopService(context: Context) {
            val intent = Intent(context, FoundframeRadicleService::class.java)
            context.stopService(intent)
        }
    }
    
    /**
     * Ensure the service is started
     * 
     * @param alias Node alias to use if starting the service
     * @return true if service is running or was started successfully
     */
    fun ensureStarted(alias: String = "android"): Boolean {
        Log.i(TAG, "[FoundframeRadicleClient] ensureStarted() called in pid ${Process.myPid()}")
        
        if (isServiceRunning()) {
            Log.d(TAG, "[FoundframeRadicleClient] Service already running")
            return true
        }
        
        Log.i(TAG, "[FoundframeRadicleClient] Starting FoundframeRadicleService with alias: $alias")
        Log.i(TAG, "[FoundframeRadicleClient] Context: ${context.applicationInfo.processName}")
        
        startService(context, alias)
        
        // Wait a bit for service to start
        var attempts = 0
        while (attempts < 10) {
            Thread.sleep(100)
            Log.d(TAG, "[FoundframeRadicleClient] Checking if service started (attempt ${attempts + 1}/10)")
            if (isServiceRunning()) {
                Log.i(TAG, "[FoundframeRadicleClient] Service started successfully after ${attempts + 1} attempts")
                return true
            }
            attempts++
        }
        
        Log.e(TAG, "[FoundframeRadicleClient] Service failed to start after 10 attempts")
        return false
    }
    
    /**
     * Check if service is running
     */
    fun isRunning(): Boolean = isServiceRunning()
}
