package ty.circulari.o19.ff

import android.content.Context
import android.Manifest
import android.app.Activity
import android.os.Build
import app.tauri.PermissionState
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import ty.circulari.o19.CameraPlugin
import ty.circulari.o19.CameraMode

@InvokeArg
class CameraOptions {
  var mode: String? = "preview"
  var cameraDirection: String? = "back"
}

@TauriPlugin(
  permissions = [
    Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "postNotification"),
    Permission(strings = [Manifest.permission.CAMERA], alias = "camera"),
    Permission(strings = [Manifest.permission.WRITE_EXTERNAL_STORAGE], alias = "writeStorage")
  ]
)

  // We define this as an external function. 
  // It expects to find a C/Rust symbol named
  // Java_ty_circulari_o19_ffi_ApiPlugin_initRustlsPlatformVerifier
  external fun initRustlsPlatformVerifier(context: Context)

class ApiPlugin(private val activity: Activity) : Plugin(activity) {
  
  private var cameraPlugin: CameraPlugin? = null
  
  override fun load(webView: android.webkit.WebView) {
    super.load(webView)
    // Initialize camera plugin with same activity and webview
    cameraPlugin = CameraPlugin(activity)
    cameraPlugin?.load(webView)
  }
  
  // ============================================================================
  // Notification Permissions
  // ============================================================================
  
  @Command
  override fun requestPermissions(invoke: Invoke){
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      val ret = JSObject()
      ret.put("status", getPermissionState("postNotification"))
      invoke.resolve(ret)
    }
    else {
      if (getPermissionState("postNotification") !== PermissionState.GRANTED) {
        requestPermissionForAlias("postNotification", invoke, "requestPermissionsCallback")
      }
    }
  }

  @PermissionCallback
  fun requestPermissionsCallback(invoke: Invoke){
    val ret = JSObject()
    ret.put("status", getPermissionState("postNotification"))
    invoke.resolve(ret)
  }
  
  // ============================================================================
  // Camera Commands
  // ============================================================================
  
  @Command
  fun startCamera(invoke: Invoke) {
    val args = invoke.parseArgs(CameraOptions::class.java)
    val mode = when (args.mode) {
      "qr" -> CameraMode.QR_SCAN
      "photo" -> CameraMode.PHOTO_CAPTURE
      else -> CameraMode.PREVIEW
    }
    
    cameraPlugin?.startCameraInternal(invoke, mode, args.cameraDirection ?: "back")
  }
  
  @Command
  fun stopCamera(invoke: Invoke) {
    cameraPlugin?.stopCameraInternal(invoke)
  }
  
  @Command
  fun setCameraMode(invoke: Invoke) {
    val args = invoke.parseArgs(CameraOptions::class.java)
    val mode = when (args.mode) {
      "qr" -> CameraMode.QR_SCAN
      "photo" -> CameraMode.PHOTO_CAPTURE
      else -> CameraMode.PREVIEW
    }
    
    cameraPlugin?.setCameraModeInternal(invoke, mode, args.cameraDirection ?: "back")
  }
  
  @Command
  fun capturePhoto(invoke: Invoke) {
    cameraPlugin?.capturePhotoInternal(invoke)
  }
  
  @Command
  fun isCameraActive(invoke: Invoke) {
    cameraPlugin?.isCameraActiveInternal(invoke)
  }
  
  // ============================================================================
  // Camera Permissions (handled directly by ApiPlugin since it's a Tauri Plugin)
  // ============================================================================
  
  @Command
  fun requestCameraPermissions(invoke: Invoke) {
    val cameraState = getPermissionState("camera")
    if (cameraState == PermissionState.GRANTED) {
      val result = JSObject().apply {
        put("camera", "granted")
        put("granted", true)
      }
      invoke.resolve(result)
    } else {
      requestPermissionForAlias("camera", invoke, "cameraPermissionCallback")
    }
  }
  
  @Command
  fun checkCameraPermissions(invoke: Invoke) {
    val cameraState = getPermissionState("camera")
    val result = JSObject().apply {
      put("camera", cameraState?.name?.lowercase() ?: "prompt")
    }
    invoke.resolve(result)
  }
  
  @PermissionCallback
  fun cameraPermissionCallback(invoke: Invoke) {
    val cameraState = getPermissionState("camera")
    val granted = cameraState == PermissionState.GRANTED
    
    val result = JSObject().apply {
      put("camera", cameraState?.name?.lowercase() ?: "denied")
      put("granted", granted)
    }
    invoke.resolve(result)
  }
  
  // ============================================================================
  // Cleanup
  // ============================================================================
  
  override fun onDestroy() {
    cameraPlugin?.onDestroy()
    super.onDestroy()
  }
}
