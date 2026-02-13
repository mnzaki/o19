package ty.circulari.o19.activities;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;

import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import ty.circulari.o19.R;
import ty.circulari.o19.bridge.ShareResultBridge;

/**
 * ReceiveShareActivity
 * 
 * Handles incoming share intents (ACTION_SEND and ACTION_SEND_MULTIPLE) from other Android apps.
 * 
 * ⚡ PURE NATIVE - NO WEBVIEW: This activity intentionally does NOT use WebView for speed.
 * WebView init takes 500ms-2s, native Activity takes < 50ms. Share UX must be instant.
 * 
 * This activity uses the "Flutter Add App" pattern:
 * 1. Receives the share intent (pure native, instant)
 * 2. Extracts shared content (text, URLs, files)
 * 3. Shows preview UI with edit capability
 * 4. User chooses: Add / Add and See / Cancel
 * 5. Stores data via ShareResultBridge
 * 
 * This activity does NOT show a WebView. For UI, use native Android UI components only.
 */
public class ReceiveShareActivity extends Activity {
    private static final String TAG = "O19-ReceiveShare";
    
    // Intent extra keys (Android standard)
    private static final String EXTRA_TEXT = Intent.EXTRA_TEXT;
    private static final String EXTRA_SUBJECT = Intent.EXTRA_SUBJECT;
    private static final String EXTRA_STREAM = Intent.EXTRA_STREAM;
    //private static final String EXTRA_STREAMS = Intent.EXTRA_STREAMS;
    
    // Share types we handle
    public enum ShareType {
        TEXT,
        URL,
        IMAGE,
        VIDEO,
        AUDIO,
        FILE,
        MIXED
    }
    
    // UI Components
    private TextInputEditText editText;
    private ImageView imagePreview;
    private FrameLayout videoIndicator;
    private LinearLayout fileInfo;
    private TextView fileName;
    private TextView urlPreview;
    
    // Share data storage
    private JSONObject shareData;
    private ShareResultBridge bridge;
    
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "ReceiveShareActivity created");
        
        setContentView(R.layout.activity_receive_share);
        
        bridge = new ShareResultBridge(this);
        
        // Initialize UI components
        initUI();
        
        // Process the incoming intent
        handleIntent(getIntent());
    }
    
    private void initUI() {
        // Find views
        editText = findViewById(R.id.editText);
        imagePreview = findViewById(R.id.imagePreview);
        videoIndicator = findViewById(R.id.videoIndicator);
        fileInfo = findViewById(R.id.fileInfo);
        fileName = findViewById(R.id.fileName);
        urlPreview = findViewById(R.id.urlPreview);
        
        Button cancelButton = findViewById(R.id.cancelButton);
        Button addButton = findViewById(R.id.addButton);
        Button addAndSeeButton = findViewById(R.id.addAndSeeButton);
        
        // Click outside bottom sheet to cancel
        findViewById(R.id.scrim).setOnClickListener(v -> onCancel());
        
        // Button click handlers
        cancelButton.setOnClickListener(v -> onCancel());
        addButton.setOnClickListener(v -> onAdd(false));
        addAndSeeButton.setOnClickListener(v -> onAdd(true));
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Log.d(TAG, "ReceiveShareActivity received new intent");
        handleIntent(intent);
    }
    
    /**
     * Process the share intent and extract shared content
     */
    private void handleIntent(Intent intent) {
        if (intent == null) {
            Log.w(TAG, "Received null intent");
            finishWithError("No intent received");
            return;
        }
        
        String action = intent.getAction();
        String type = intent.getType();
        
        Log.d(TAG, "Handling intent: action=" + action + ", type=" + type);
        
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            Log.w(TAG, "Unsupported action: " + action);
            finishWithError("Unsupported action");
            return;
        }
        
        try {
            shareData = new JSONObject();
            shareData.put("action", action);
            shareData.put("mimeType", type);
            shareData.put("timestamp", System.currentTimeMillis());
            
            if (Intent.ACTION_SEND.equals(action)) {
                // Single item share
                handleSingleShare(intent, type);
            } else {
                // Multiple items share
                throw new UnsupportedOperationException("Multiple item share not supported");
                //handleMultipleShare(intent, type);
            }
            
            // Update UI with preview
            updatePreviewUI(type);
            
        } catch (JSONException e) {
            Log.e(TAG, "Error building share data JSON", e);
            finishWithError("Failed to process share data");
        }
    }
    
    /**
     * Handle single item share (ACTION_SEND)
     */
    private void handleSingleShare(Intent intent, String type) throws JSONException {
        // Check for text content
        if (intent.hasExtra(EXTRA_TEXT)) {
            String text = intent.getStringExtra(EXTRA_TEXT);
            shareData.put("originalText", text);
            
            // Check if text is a URL
            if (text != null && (text.startsWith("http://") || text.startsWith("https://"))) {
                shareData.put("shareType", ShareType.URL.name());
                shareData.put("url", text);
                // Pre-fill edit text with URL for editing
                editText.setText(text);
            } else {
                shareData.put("shareType", ShareType.TEXT.name());
                // Pre-fill edit text with the shared text
                editText.setText(text);
            }
        }
        
        // Check for subject (often contains title for URLs)
        if (intent.hasExtra(EXTRA_SUBJECT)) {
            String subject = intent.getStringExtra(EXTRA_SUBJECT);
            shareData.put("subject", subject);
            // If no text was shared, use subject
            if (!shareData.has("originalText") && subject != null) {
                editText.setText(subject);
            }
        }
        
        // Check for file/stream content
        Uri streamUri = intent.getParcelableExtra(EXTRA_STREAM);
        if (streamUri != null) {
            JSONObject fileData = uriToJson(streamUri);
            shareData.put("file", fileData);
            
            // Update share type based on mime type
            if (type != null) {
                if (type.startsWith("image/")) {
                    shareData.put("shareType", ShareType.IMAGE.name());
                    // Show image preview
                    imagePreview.setImageURI(streamUri);
                } else if (type.startsWith("video/")) {
                    shareData.put("shareType", ShareType.VIDEO.name());
                } else if (type.startsWith("audio/")) {
                    shareData.put("shareType", ShareType.AUDIO.name());
                } else {
                    shareData.put("shareType", ShareType.FILE.name());
                }
            }
            
            // Pre-fill edit text with filename if no text
            if (!shareData.has("originalText")) {
                String name = fileData.optString("fileName", "");
                if (!name.isEmpty()) {
                    editText.setText(name);
                }
            }
        }
    }
    
    /**
     * Handle multiple item share (ACTION_SEND_MULTIPLE)
     *
     * TODO borked or just streams????
     *
    private void handleMultipleShare(Intent intent, String type) throws JSONException {
        shareData.put("shareType", ShareType.MIXED.name());
        
        // Check for multiple URIs
        List<Uri> uris = intent.getParcelableArrayListExtra(EXTRA_STREAM);
        if (uris != null && !uris.isEmpty()) {
            JSONArray filesArray = new JSONArray();
            for (Uri uri : uris) {
                filesArray.put(uriToJson(uri));
            }
            shareData.put("files", filesArray);
            shareData.put("fileCount", uris.size());
            
            // Show first image if available
            for (Uri uri : uris) {
                if (type != null && type.startsWith("image/")) {
                    imagePreview.setImageURI(uri);
                    break;
                }
            }
        }
        
        // Pre-fill with count info
        int count = shareData.optInt("fileCount", 0);
        if (count > 0 && !shareData.has("originalText")) {
            editText.setText(count + " files shared");
        }
    }
    /**/
    
    /**
     * Update the preview UI based on share type
     */
    private void updatePreviewUI(String mimeType) {
        // Hide all previews first
        imagePreview.setVisibility(View.GONE);
        videoIndicator.setVisibility(View.GONE);
        fileInfo.setVisibility(View.GONE);
        urlPreview.setVisibility(View.GONE);
        
        String shareType = shareData.optString("shareType", "TEXT");
        
        switch (shareType) {
            case "IMAGE":
                imagePreview.setVisibility(View.VISIBLE);
                break;
            case "VIDEO":
                videoIndicator.setVisibility(View.VISIBLE);
                break;
            case "URL":
                urlPreview.setText(shareData.optString("url", ""));
                urlPreview.setVisibility(View.VISIBLE);
                break;
            case "FILE":
            case "AUDIO":
                JSONObject file = shareData.optJSONObject("file");
                if (file != null) {
                    fileName.setText(file.optString("fileName", "Unknown file"));
                    fileInfo.setVisibility(View.VISIBLE);
                }
                break;
            case "MIXED":
                // Show first image if available
                JSONArray files = shareData.optJSONArray("files");
                if (files != null && files.length() > 0) {
                    try {
                        JSONObject firstFile = files.getJSONObject(0);
                        String uriStr = firstFile.optString("uri");
                        if (uriStr != null && mimeType != null && mimeType.startsWith("image/")) {
                            imagePreview.setImageURI(Uri.parse(uriStr));
                            imagePreview.setVisibility(View.VISIBLE);
                        } else {
                            fileName.setText(files.length() + " files");
                            fileInfo.setVisibility(View.VISIBLE);
                        }
                    } catch (JSONException e) {
                        fileName.setText(files.length() + " files");
                        fileInfo.setVisibility(View.VISIBLE);
                    }
                }
                break;
        }
    }
    
    /**
     * Convert a URI to JSON representation
     */
    private JSONObject uriToJson(Uri uri) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("uri", uri.toString());
        json.put("scheme", uri.getScheme());
        
        // Try to extract file name from URI
        String path = uri.getPath();
        if (path != null) {
            int lastSlash = path.lastIndexOf('/');
            if (lastSlash >= 0) {
                json.put("fileName", path.substring(lastSlash + 1));
            } else {
                json.put("fileName", path);
            }
        }
        
        return json;
    }
    
    /**
     * Cancel button clicked - just go back
     */
    private void onCancel() {
        Log.d(TAG, "Cancelled by user");
        Toast.makeText(this, R.string.share_cancelled, Toast.LENGTH_SHORT).show();
        setResult(RESULT_CANCELED);
        finish();
    }
    
    /**
     * Add button clicked
     * @param launchMainApp if true, launch MainActivity after adding
     */
    private void onAdd(boolean launchMainApp) {
        Log.d(TAG, "Add clicked, launchMainApp=" + launchMainApp);
        
        try {
            // Get edited text from the text area
            String editedText = editText.getText() != null ? editText.getText().toString() : "";
            shareData.put("editedText", editedText);
            shareData.put("userAction", launchMainApp ? "ADD_AND_SEE" : "ADD");
            
            // Store the share data
            bridge.deliverShareResult(shareData, launchMainApp);
            
            Toast.makeText(this, R.string.share_added, Toast.LENGTH_SHORT).show();
            
            if (launchMainApp) {
                // Result will be handled by main activity launch
                setResult(RESULT_OK);
            } else {
                // Just return to the previous (external) activity
                setResult(RESULT_OK);
                finish();
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error saving share", e);
            Toast.makeText(this, R.string.share_error, Toast.LENGTH_SHORT).show();
            finishWithError("Failed to save share");
        }
    }
    
    /**
     * Finish activity with error
     */
    private void finishWithError(String errorMessage) {
        Toast.makeText(this, errorMessage, Toast.LENGTH_SHORT).show();
        Intent result = new Intent();
        result.putExtra("error", errorMessage);
        setResult(RESULT_CANCELED, result);
        finish();
    }
    
    @Override
    public void finish() {
        super.finish();
        // Disable exit animation for seamless transition
        overridePendingTransition(0, 0);
    }
}
