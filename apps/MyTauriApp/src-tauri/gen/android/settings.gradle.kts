include(":app")
apply("tauri.settings.gradle")
include(":o19-android")
project(":o19-android").projectDir = File("../../../../../../o19/crates/android").normalize()
