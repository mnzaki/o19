package ty.circulari.o19.ff

import android.content.Context
import android.Manifest
import android.app.Activity
import android.os.Build
import app.tauri.PermissionState
import app.tauri.annotation.Command
import app.tauri.annotation.Permission
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject

@TauriPlugin(
  permissions = [
    Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "postNotification")
  ]
)

  // We define this as an external function. 
  // It expects to find a C/Rust symbol named
  // Java_ty_circulari_o19_ffi_ApiPlugin_initRustlsPlatformVerifier
  external fun initRustlsPlatformVerifier(context: Context)

class ApiPlugin(private val activity: Activity) : Plugin(activity) {
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
}
