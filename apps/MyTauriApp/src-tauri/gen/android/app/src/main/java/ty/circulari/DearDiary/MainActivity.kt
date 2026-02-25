package ty.circulari.DearDiary

//import ty.circulari.o19.ffi.initRustlsPlatformVerifier

import android.os.Bundle
import android.content.Context
import androidx.activity.enableEdgeToEdge

import android.net.wifi.WifiManager
import android.net.wifi.WifiManager.MulticastLock

class MainActivity : TauriActivity() {
  // Hold a reference to the lock so it isn't garbage collected
  // TODO move this to android-activities
  private var multicastLock: MulticastLock? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    //initRustlsPlatformVerifier(this)
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    // 1. Acquire the Multicast Lock
    val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    multicastLock = wifiManager.createMulticastLock("deardiary_lock")
    multicastLock?.setReferenceCounted(true)
    multicastLock?.acquire()

    android.util.Log.i("TauriApp", "Multicast Lock Acquired")
  }

  override fun onDestroy() {
    super.onDestroy()

    // 2. Release it when the app closes to save user battery
    if (multicastLock != null && multicastLock!!.isHeld) {
      multicastLock?.release()
      android.util.Log.i("TauriApp", "Multicast Lock Released")
    }
  }
}