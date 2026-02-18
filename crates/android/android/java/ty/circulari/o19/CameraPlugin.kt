// CameraPlugin.kt
// Integrated camera for o19-foundframe-tauri - lives in main Tauri activity, shows preview behind WebView
// Handles: QR scanning (when foreground pulled down), photo capture (saved to gallery natively)
// Note: This is NOT a Tauri plugin - it's a utility class used by ApiPlugin

package ty.circulari.o19

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.MediaStore
import android.util.Log
import android.util.Size
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.UseCase
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

private const val TAG = "O19-ANDROID"

/// Camera operation modes
enum class CameraMode {
    PREVIEW,      // Just show camera, no analysis
    QR_SCAN,      // QR code scanning mode
    PHOTO_CAPTURE // Photo capture mode
}

/// Camera utility class - manages camera operations but is NOT a Tauri plugin.
/// Used by ApiPlugin (in @o19/foundframe-tauri) to handle camera commands.
class CameraPlugin(private val activity: android.app.Activity) {

    private var webView: WebView? = null
    private var previewView: PreviewView? = null
    private var cameraProviderFuture: com.google.common.util.concurrent.ListenableFuture<ProcessCameraProvider>? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private var imageCapture: ImageCapture? = null
    private var imageAnalysis: ImageAnalysis? = null

    private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private var vibrator: Vibrator? = null

    // QR scanning
    private var scanner: com.google.mlkit.vision.barcode.BarcodeScanner? = null
    private var isScanningForQr = false
    private var lastAnalyzedTimestamp = 0L
    private val ANALYSIS_INTERVAL_MS = 200L  // 5 fps for QR scanning

    // State
    private var currentMode = CameraMode.PREVIEW
    private var webViewBackground: Drawable? = null
    private var isCameraActive = false

    fun load(webView: WebView) {
        this.webView = webView
        
        // Configure WebView for transparency support
        // Note: LAYER_TYPE_SOFTWARE is needed for transparency to work reliably
        webView.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null)
        webView.setBackgroundColor(Color.TRANSPARENT)
        
        Log.d(TAG, "CameraPlugin loaded. WebView hardware accelerated: ${webView.isHardwareAccelerated}")
    }

    // ============================================================================
    // Camera Setup & Lifecycle
    // ============================================================================

    private fun setupCamera(mode: CameraMode, cameraDirection: String) {
        Log.d(TAG, "Setting up camera: mode=$mode, direction=$cameraDirection")

        val webView = this.webView ?: run {
            Log.e(TAG, "WebView not loaded")
            return
        }

        activity.runOnUiThread {
            // Create PreviewView for camera feed
            val previewView = PreviewView(activity).apply {
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                scaleType = PreviewView.ScaleType.FILL_CENTER
            }
            this.previewView = previewView

            // Add preview behind WebView
            val parent = webView.parent as ViewGroup
            parent.addView(previewView, 0)  // Add at index 0 (behind WebView)

            // Bring WebView to front and make it transparent so camera shows through
            webView.bringToFront()
            webViewBackground = webView.background
            webView.setBackgroundColor(Color.TRANSPARENT)
            
            Log.d(TAG, "WebView transparency set. WebView parent: ${parent.javaClass.simpleName}, child count: ${parent.childCount}")

            // Initialize CameraX
            cameraProviderFuture = ProcessCameraProvider.getInstance(activity).apply {
                addListener({
                    try {
                        val provider = get()
                        bindCameraUseCases(provider, mode, cameraDirection)
                        cameraProvider = provider
                        isCameraActive = true
                        Log.d(TAG, "Camera setup complete")
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to get camera provider", e)
                    }
                }, ContextCompat.getMainExecutor(activity))
            }
        }
    }

    private fun bindCameraUseCases(
        provider: ProcessCameraProvider,
        mode: CameraMode,
        cameraDirection: String
    ) {
        // Check if we can optimize by only rebinding changing use cases
        val isAlreadyRunning = camera != null && currentMode != CameraMode.PREVIEW
        val lensFacing = when (cameraDirection) {
            "front" -> CameraSelector.LENS_FACING_FRONT
            else -> CameraSelector.LENS_FACING_BACK
        }
        val cameraSelector = CameraSelector.Builder().requireLensFacing(lensFacing).build()

        // If switching modes and camera is running, try to preserve preview
        if (isAlreadyRunning) {
            // Just rebind use cases without destroying preview
            rebindUseCases(provider, mode)
            return
        }

        // Full bind - unbind everything first
        provider.unbindAll()

        // Preview use case - use low resolution for performance
        val preview = Preview.Builder()
            .setTargetResolution(Size(640, 480))  // Low res for smooth preview
            .build()
            .apply {
                setSurfaceProvider(previewView?.surfaceProvider)
            }

        // Build use cases list (always include preview)
        val useCases = mutableListOf<UseCase>(preview)

        // Add mode-specific use cases
        addModeUseCases(mode, useCases)

        try {
            camera = provider.bindToLifecycle(
                activity as LifecycleOwner,
                cameraSelector,
                *useCases.toTypedArray()
            )
            currentMode = mode
            Log.d(TAG, "Camera use cases bound: $mode")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to bind camera use cases", e)
        }
    }

    private fun rebindUseCases(provider: ProcessCameraProvider, mode: CameraMode) {
        Log.d(TAG, "Rebinding use cases for mode: $mode (current: $currentMode)")

        // Unbind only the changing use cases, keep preview
        when (currentMode) {
            CameraMode.QR_SCAN -> {
                imageAnalysis?.let { provider.unbind(it) }
                isScanningForQr = false
                scanner = null
            }
            CameraMode.PHOTO_CAPTURE -> {
                imageCapture?.let { provider.unbind(it) }
                imageCapture = null
            }
            else -> {}
        }

        // Bind new use cases
        val newUseCases = mutableListOf<UseCase>()
        addModeUseCases(mode, newUseCases)

        if (newUseCases.isNotEmpty()) {
            try {
                provider.bindToLifecycle(
                    activity as LifecycleOwner,
                    camera?.cameraInfo?.let { 
                        // Use same camera selector
                        CameraSelector.Builder().requireLensFacing(
                            if (it.hasFlashUnit()) CameraSelector.LENS_FACING_BACK else CameraSelector.LENS_FACING_FRONT
                        ).build()
                    } ?: CameraSelector.DEFAULT_BACK_CAMERA,
                    *newUseCases.toTypedArray()
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to rebind use cases, doing full rebind", e)
                // Fall back to full rebind
                bindCameraUseCases(provider, mode, "back")
                return
            }
        }

        currentMode = mode
        Log.d(TAG, "Use cases rebound to: $mode")
    }

    private fun addModeUseCases(mode: CameraMode, useCases: MutableList<UseCase>) {
        when (mode) {
            CameraMode.QR_SCAN -> {
                // ImageAnalysis for QR scanning - higher res but throttled
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setTargetResolution(Size(1280, 720))
                    .setImageQueueDepth(1)  // Only keep 1 frame to reduce lag
                    .build()
                    .apply {
                        setAnalyzer(cameraExecutor, QrAnalyzer())
                    }
                imageAnalysis = analysis
                useCases.add(analysis)

                // Setup QR scanner
                val options = BarcodeScannerOptions.Builder()
                    .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                    .build()
                scanner = BarcodeScanning.getClient(options)
                isScanningForQr = true
            }

            CameraMode.PHOTO_CAPTURE -> {
                // ImageCapture for taking photos
                val capture = ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                    .setTargetResolution(Size(1920, 1080))  // 1080p for photos
                    .build()
                imageCapture = capture
                useCases.add(capture)
            }

            CameraMode.PREVIEW -> {
                // Just preview, no additional use cases
                isScanningForQr = false
            }
        }
    }

    private fun dismantleCamera() {
        Log.d(TAG, "Dismantling camera")

        activity.runOnUiThread {
            isScanningForQr = false
            isCameraActive = false

            // Unbind use cases
            cameraProvider?.unbindAll()
            cameraProvider = null
            camera = null
            imageCapture = null
            imageAnalysis = null
            scanner = null

            // Remove preview view
            previewView?.let { view ->
                val parent = webView?.parent as? ViewGroup
                parent?.removeView(view)
            }
            previewView = null

            // Restore WebView background
            webView?.let { wv ->
                webViewBackground?.let { wv.background = it }
                    ?: wv.setBackgroundColor(Color.WHITE)
            }
            webViewBackground = null

            // Cancel any pending futures
            cameraProviderFuture?.cancel(true)
            cameraProviderFuture = null
        }
    }

    // ============================================================================
    // QR Code Scanning (Internal - uses composition to hide CameraX from API)
    // ============================================================================
    
    private inner class QrAnalyzer : ImageAnalysis.Analyzer {
        override fun analyze(imageProxy: ImageProxy) {
        // Frame rate limiting - skip frames to maintain ~5fps
        val currentTimestamp = System.currentTimeMillis()
        if (currentTimestamp - lastAnalyzedTimestamp < ANALYSIS_INTERVAL_MS) {
            imageProxy.close()
            return
        }
        lastAnalyzedTimestamp = currentTimestamp

        if (!isScanningForQr || scanner == null) {
            imageProxy.close()
            return
        }

        @Suppress("UnsafeOptInUsageError")
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val inputImage = InputImage.fromMediaImage(
                mediaImage,
                imageProxy.imageInfo.rotationDegrees
            )

            scanner?.process(inputImage)
                ?.addOnSuccessListener { barcodes ->
                    if (barcodes.isNotEmpty()) {
                        val barcode = barcodes[0]
                        val rawValue = barcode.rawValue
                        if (!rawValue.isNullOrEmpty()) {
                            onQrCodeDetected(rawValue)
                        }
                    }
                }
                ?.addOnFailureListener { e ->
                    Log.e(TAG, "QR scan error: ${e.message}", e)
                }
                ?.addOnCompleteListener {
                    imageProxy.close()
                    mediaImage.close()
                }
        } else {
            imageProxy.close()
        }
        }
        
        private fun onQrCodeDetected(content: String) {
        Log.d(TAG, "QR Code detected: $content")

        // Vibrate feedback
        vibrator = activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(50)
        }

        // Emit event via WebView
        val event = JSObject().apply {
            put("content", content)
            put("timestamp", System.currentTimeMillis())
        }
        
        // Use Plugin's trigger method via reflection or callback
        // For now, we'll emit a custom event that the JS side can listen for
        webView?.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('qr-scanned', { detail: ${event.toString()} }))",
            null
        )
        }
    }

    // ============================================================================
    // Photo Capture
    // ============================================================================

    private fun doCapturePhoto(invoke: Invoke) {
        val imageCapture = this.imageCapture ?: run {
            invoke.reject("Camera not in photo capture mode")
            return
        }

        // Create file name with timestamp
        val name = SimpleDateFormat("yyyy-MM-dd-HH-mm-ss-SSS", Locale.US)
            .format(System.currentTimeMillis())

        // For Android 10+ (API 29+), use MediaStore
        val contentValues = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/DearDiary")
            }
        }

        val outputOptions = ImageCapture.OutputFileOptions.Builder(
            activity.contentResolver,
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            contentValues
        ).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(activity),
            object : ImageCapture.OnImageSavedCallback {
                override fun onError(exc: ImageCaptureException) {
                    Log.e(TAG, "Photo capture failed: ${exc.message}", exc)
                    invoke.reject("Capture failed: ${exc.message}")
                }

                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val savedUri = output.savedUri
                    Log.d(TAG, "Photo saved: $savedUri")

                    val result = JSObject().apply {
                        put("uri", savedUri?.toString() ?: "")
                        put("success", true)
                        put("timestamp", System.currentTimeMillis())
                    }
                    invoke.resolve(result)
                }
            }
        )
    }

    // ============================================================================
    // Public API for ApiPlugin
    // ============================================================================

    fun startCameraInternal(invoke: Invoke, mode: CameraMode, cameraDirection: String) {
        // Note: Permissions should be checked by ApiPlugin before calling this
        
        // Stop any existing camera first
        if (isCameraActive) {
            dismantleCamera()
        }

        setupCamera(mode, cameraDirection)

        val result = JSObject().apply {
            put("started", true)
            put("mode", mode.name.lowercase())
        }
        invoke.resolve(result)
    }

    fun stopCameraInternal(invoke: Invoke) {
        dismantleCamera()

        val result = JSObject().apply {
            put("stopped", true)
        }
        invoke.resolve(result)
    }

    fun setCameraModeInternal(invoke: Invoke, mode: CameraMode, cameraDirection: String) {
        if (!isCameraActive) {
            invoke.reject("Camera not active")
            return
        }

        // Rebind with new mode
        cameraProvider?.let { provider ->
            bindCameraUseCases(provider, mode, cameraDirection)
        }

        val result = JSObject().apply {
            put("mode", mode.name.lowercase())
        }
        invoke.resolve(result)
    }

    fun capturePhotoInternal(invoke: Invoke) {
        if (!isCameraActive) {
            invoke.reject("Camera not active")
            return
        }

        if (currentMode != CameraMode.PHOTO_CAPTURE) {
            invoke.reject("Camera not in photo capture mode")
            return
        }

        doCapturePhoto(invoke)
    }

    fun isCameraActiveInternal(invoke: Invoke) {
        val result = JSObject().apply {
            put("active", isCameraActive)
            put("mode", currentMode.name.lowercase())
        }
        invoke.resolve(result)
    }

    // ============================================================================
    // Cleanup
    // ============================================================================

    fun onDestroy() {
        Log.d(TAG, "Destroying CameraPlugin")
        dismantleCamera()
        cameraExecutor.shutdown()
    }
}
