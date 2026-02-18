package ty.circulari.o19.ff

import android.content.Context

class Preferences(private val context: Context) {
  private val preferencesName = "Preferences"

  fun setRegion(region: String) {
    val sharedPreferences = context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE)

    with(sharedPreferences.edit()) {
      putString("region", region)
      apply()
    }
  }

  fun getRegion(): String {
    val sharedPreferences = context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE)

    // we default on europe-west because it's the most common region
    return sharedPreferences.getString("region", "europe-west")!!
  }
}
