import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
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

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 36
    namespace = "ty.circulari.DearDiary"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "ty.circulari.DearDiary"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")