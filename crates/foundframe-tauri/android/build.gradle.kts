plugins {
  id("com.android.library")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "ty.circulari.o19.ff"
  compileSdk = 34

  defaultConfig {
    minSdk = 21

    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    consumerProguardFiles("consumer-rules.pro")
    
    // Only include 64-bit ABIs (rsbinder has issues on 32-bit)
    ndk {
      abiFilters.addAll(listOf("arm64-v8a", "x86_64"))
    }
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_1_8
    targetCompatibility = JavaVersion.VERSION_1_8
  }
  kotlinOptions { jvmTarget = "1.8" }
}

dependencies {
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.appcompat:appcompat:1.6.0")
  implementation("com.google.android.material:material:1.8.0")
  implementation("androidx.work:work-runtime-ktx:2.9.1")
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("com.google.firebase:firebase-messaging:24.1.0")
  testImplementation("junit:junit:4.13.2")
  androidTestImplementation("androidx.test.ext:junit:1.1.5")
  androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
  implementation(project(":tauri-android"))
  
  // o19-android (contains CameraPlugin and other activities)
  implementation(project(":o19-android"))

  // This is for rustls to function correctly with system cert store
  implementation("rustls:rustls-platform-verifier:0.1.1")
}

val rustlsMavenPath: String = run {
    // We need to find src-tauri.
    // project.rootDir is 'gen/android', so we go up two levels.
    val tauriRoot = project.rootDir.parentFile.parentFile

    val crateInfo = providers.exec {
        workingDir = tauriRoot
        commandLine(
            "cargo", "metadata",
            "--format-version", "1",
            "--filter-platform", "aarch64-linux-android",
            "--manifest-path", "Cargo.toml" // Points to src-tauri/Cargo.toml
        )
    }.standardOutput.asText.get()

    val json = groovy.json.JsonSlurper().parseText(crateInfo) as Map<*, *>
    val packages = json["packages"] as List<Map<*, *>>
    val pkg = packages.find { it["name"] == "rustls-platform-verifier-android" }
        ?: throw GradleException("Could not find rustls-platform-verifier-android crate")

    val manifestPath = File(pkg["manifest_path"] as String)
    // Return the absolute path to the maven folder
    File(manifestPath.parentFile, "maven").absolutePath
}

repositories {
    maven {
        url = uri(rustlsMavenPath)
    }
}

/**
 * The following is to support rustls-platform-verifier
 *
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

buildscript {
  dependencies {
    classpath("org.jetbrains.kotlinx:kotlinx-serialization-json:1.10.0")
  }
}
 */
