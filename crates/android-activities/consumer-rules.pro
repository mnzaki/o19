# Consumer ProGuard rules for o19-android-activities
# These rules are automatically included when consumers use this library

# Keep all public API classes
-keep public class ty.circulari.o19.** {
    public *;
}

# Keep share data JSON structure
-keepclassmembers class ty.circulari.o19.** {
    *;
}
