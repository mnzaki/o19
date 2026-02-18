package ty.circulari.o19.bridge;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * ShareResultBridge
 * 
 * Bridges share results from ReceiveShareActivity to the Tauri app.
 * 
 * Strategy:
 * 1. Store share data in SharedPreferences (accessible from main app process)
 * 2. Launch/Bring to foreground the main Tauri activity
 * 3. Tauri app reads pending shares on startup/resume via plugin command
 * 
 * This "Flutter Add App" pattern ensures the share data survives process
 * boundaries and is reliably delivered even if the main app was not running.
 */
public class ShareResultBridge {
    private static final String TAG = "O19-ShareBridge";
    
    // SharedPreferences keys
    private static final String PREFS_NAME = "o19_pending_shares";
    private static final String KEY_PENDING_SHARE = "pending_share";
    private static final String KEY_SHARE_TIMESTAMP = "share_timestamp";
    
    // Main activity class name (to be configured by the app)
    private static String sMainActivityClass = null;
    
    private final Context context;
    private final SharedPreferences prefs;
    
    public ShareResultBridge(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
    
    /**
     * Set the main activity class name for launching the app.
     * Must be called before deliverShareResult() for auto-launch to work.
     * 
     * @param className Full class name of the main activity (e.g., "com.example.app.MainActivity")
     */
    public static void setMainActivityClass(String className) {
        sMainActivityClass = className;
    }
    
    /**
     * Deliver a share result to the main Tauri app.
     * Stores the data and optionally launches the main activity.
     * 
     * @param shareData The share data to store
     * @param launchMainApp If true, launch the main activity; if false, just store data
     */
    public void deliverShareResult(JSONObject shareData, boolean launchMainApp) {
        Log.d(TAG, "Delivering share result: " + shareData.toString());
        
        // Store share data in SharedPreferences
        storePendingShare(shareData);
        
        // Launch or bring to foreground the main app if requested
        if (launchMainApp) {
            launchMainApp();
        }
    }
    
    /**
     * Deliver a share result without launching main app (for backwards compatibility)
     */
    public void deliverShareResult(JSONObject shareData) {
        deliverShareResult(shareData, false);
    }
    
    /**
     * Store share data in SharedPreferences for retrieval by main app
     */
    private void storePendingShare(JSONObject shareData) {
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_PENDING_SHARE, shareData.toString());
        editor.putLong(KEY_SHARE_TIMESTAMP, System.currentTimeMillis());
        editor.apply();
        
        Log.d(TAG, "Share data stored in preferences");
    }
    
    /**
     * Launch the main Tauri app activity or bring it to foreground
     */
    private void launchMainApp() {
        if (sMainActivityClass == null) {
            Log.w(TAG, "Main activity class not set. Cannot launch app.");
            return;
        }
        
        try {
            Class<?> mainActivityClass = Class.forName(sMainActivityClass);
            Intent intent = new Intent(context, mainActivityClass);
            
            // Flags to bring existing activity to front or start new one
            intent.setFlags(
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
            );
            
            // Add action to indicate this was launched from share
            intent.setAction("ty.circulari.o19.ACTION_SHARE_RECEIVED");
            
            context.startActivity(intent);
            Log.d(TAG, "Launched main app activity: " + sMainActivityClass);
            
        } catch (ClassNotFoundException e) {
            Log.e(TAG, "Main activity class not found: " + sMainActivityClass, e);
        }
    }
    
    /**
     * Get any pending share data and clear it from storage.
     * Called by the Tauri plugin when the app starts or resumes.
     * 
     * @return JSONObject of share data, or null if no pending share
     */
    public JSONObject getPendingShare() {
        String shareJson = prefs.getString(KEY_PENDING_SHARE, null);
        
        if (shareJson == null) {
            return null;
        }
        
        try {
            JSONObject shareData = new JSONObject(shareJson);
            
            // Clear the pending share after reading
            clearPendingShare();
            
            Log.d(TAG, "Retrieved pending share: " + shareData.toString());
            return shareData;
            
        } catch (JSONException e) {
            Log.e(TAG, "Failed to parse pending share JSON", e);
            clearPendingShare();
            return null;
        }
    }
    
    /**
     * Peek at pending share without clearing it (for checking if share exists)
     */
    public boolean hasPendingShare() {
        return prefs.contains(KEY_PENDING_SHARE);
    }
    
    /**
     * Get the timestamp of when the pending share was received
     */
    public long getPendingShareTimestamp() {
        return prefs.getLong(KEY_SHARE_TIMESTAMP, 0);
    }
    
    /**
     * Clear any pending share data
     */
    public void clearPendingShare() {
        SharedPreferences.Editor editor = prefs.edit();
        editor.remove(KEY_PENDING_SHARE);
        editor.remove(KEY_SHARE_TIMESTAMP);
        editor.apply();
        
        Log.d(TAG, "Pending share cleared");
    }
}
