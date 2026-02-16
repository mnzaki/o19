# ProGuard rules for o19-android-activities

# Keep public API
-keep public class ty.circulari.o19.activities.ReceiveShareActivity {
    public *;
}

-keep public class ty.circulari.o19.bridge.ShareResultBridge {
    public *;
}

# Keep JSON serialization for share data
-keepclassmembers class * {
    @org.json.JSONField <fields>;
}

# Keep JSONObject for bridge communication
-keep class org.json.** { *; }

# AndroidX
-keep class androidx.** { *; }
-dontwarn androidx.**
