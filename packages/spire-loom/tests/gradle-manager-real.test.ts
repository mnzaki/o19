/**
 * Tests for gradle-manager with real-world build.gradle
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureGradleBlock,
  ensureGradleSourceSet,
  clearGradleBlockRegistry,
} from '../machinery/shuttle/gradle-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join('/tmp', `gradle-real-test-${Date.now()}`);

// Actual build.gradle content from foundframe-android
const REAL_BUILD_GRADLE = `/**
 * o19-android
 * 
 * Android library package for o19 apps
 * Provides activities for handling platform-specific intents (share, etc.)
 * that can be launched from Tauri-based apps.
 */

plugins {
    id 'com.android.library'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'ty.circulari.o19'
    compileSdk 34

    defaultConfig {
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "0.1.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles "consumer-rules.pro"
        
        // Only include 64-bit ABIs (rsbinder has issues on 32-bit)
        ndk {
            abiFilters 'arm64-v8a', 'x86_64'
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = '17'
    }
    
    buildFeatures {
        viewBinding true
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    
    // CameraX
    def camerax_version = "1.3.3"
    implementation "androidx.camera:camera-core:$camerax_version"
    implementation "androidx.camera:camera-camera2:$camerax_version"
    implementation "androidx.camera:camera-lifecycle:$camerax_version"
    implementation "androidx.camera:camera-view:$camerax_version"
    
    // ML Kit for QR scanning
    implementation 'com.google.mlkit:barcode-scanning:17.2.0'
    
    // Tauri Android bindings
    compileOnly project(':tauri-android')
    
    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
}

// Rust/Cargo integration
// Requires cargo-ndk: cargo install cargo-ndk
// NOTE: rsbinder only compiles for Android targets, not host!
android {
    sourceSets {
        main {
            // Java/Kotlin sources are in android/java (not src/main/java)
            java.srcDirs = ['./android/java']
            // Resources are in android/res
            res.srcDirs = ['./android/res']
            // AIDL files are in android/aidl
            aidl.srcDirs = ['./android/aidl']
            // JNI libs
            jniLibs.srcDirs = ['./android/jniLibs']
            // Assets
            assets.srcDirs = ['./android/assets']
            // Manifest
            manifest.srcFile './android/AndroidManifest.xml'
        }
    }
}

// AAR publishing configuration
//afterEvaluate {
//    publishing {
//        publications {
//            release(MavenPublication) {
//                from components.release
//                groupId = 'ty.circulari'
//                artifactId = 'o19-android'
//                version = '0.1.0'
//            }
//        }
//    }
//}
`;

describe('gradle-manager with real build.gradle', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    clearGradleBlockRegistry();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('adds Rust build block to real build.gradle', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, REAL_BUILD_GRADLE);

    const result = ensureGradleBlock(gradlePath, 'RustBuild', `
// Task to build Rust code using cargo-ndk
tasks.register('buildRust', Exec) {
    group = 'build'
    description = 'Build Rust code for Android targets'
    
    commandLine 'cargo', 'ndk',
        '-t', 'arm64-v8a',
        '-t', 'x86_64',
        '-o', './android/jniLibs',
        'build', '--release'
}

preBuild.dependsOn buildRust
`, { after: 'android {' });

    assert.strictEqual(result, true);
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    
    // Check the block was added
    assert.ok(content.includes('// spire-loom:RustBuild'), 'Should have start marker');
    assert.ok(content.includes('// /spire-loom:RustBuild'), 'Should have end marker');
    assert.ok(content.includes('tasks.register(\'buildRust\''), 'Should have task registration');
    assert.ok(content.includes('preBuild.dependsOn buildRust'), 'Should have dependency');
    
    // Check original content is preserved
    assert.ok(content.includes("namespace 'ty.circulari.o19'"), 'Should preserve namespace');
    assert.ok(content.includes('compileSdk 34'), 'Should preserve compileSdk');
    assert.ok(content.includes('dependencies {'), 'Should preserve dependencies');
    assert.ok(content.includes('// Rust/Cargo integration'), 'Should preserve comments');
  });

  it('adds source set to existing android block', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, REAL_BUILD_GRADLE);

    const result = ensureGradleSourceSet(gradlePath, 'main', {
      java: ['./spire/android/java'],
      aidl: ['./spire/android/aidl'],
      jniLibs: ['./spire/android/jniLibs'],
      manifest: './spire/android/AndroidManifest.xml',
    });

    assert.strictEqual(result, true);
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    
    // Check new source set paths are added (using srcDir to append)
    assert.ok(content.includes("java.srcDir './spire/android/java'"), 'Should have java srcDir');
    assert.ok(content.includes("aidl.srcDir './spire/android/aidl'"), 'Should have aidl srcDir');
    assert.ok(content.includes("jniLibs.srcDir './spire/android/jniLibs'"), 'Should have jniLibs');
    assert.ok(content.includes("manifest.srcFile './spire/android/AndroidManifest.xml'"), 'Should have manifest');
    
    // Source set block is now appended at end of file (safer than trying to nest)
  });

  it('preserves formatting and comments', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, REAL_BUILD_GRADLE);

    ensureGradleBlock(gradlePath, 'TestBlock', '// test');

    const content = fs.readFileSync(gradlePath, 'utf-8');
    
    // Check block comments are preserved
    assert.ok(content.includes('/**'), 'Should preserve Javadoc comment start');
    assert.ok(content.includes(' * o19-android'), 'Should preserve Javadoc content');
    assert.ok(content.includes(' */'), 'Should preserve Javadoc end');
    
    // Check inline comments are preserved
    assert.ok(content.includes('// Only include 64-bit ABIs'), 'Should preserve inline comments');
    assert.ok(content.includes('// CameraX'), 'Should preserve section comments');
    assert.ok(content.includes('// Rust/Cargo integration'), 'Should preserve Rust comments');
  });

  it('idempotent - no duplicate blocks on second run', () => {
    const gradlePath = path.join(TEST_DIR, 'build.gradle');
    fs.writeFileSync(gradlePath, REAL_BUILD_GRADLE);

    ensureGradleBlock(gradlePath, 'RustBuild', '// content');
    clearGradleBlockRegistry();
    const result = ensureGradleBlock(gradlePath, 'RustBuild', '// content');

    assert.strictEqual(result, false, 'Should not modify on second run');
    
    const content = fs.readFileSync(gradlePath, 'utf-8');
    
    // Count occurrences of the marker
    const matches = content.match(/spire-loom:RustBuild/g);
    assert.strictEqual(matches?.length, 2, 'Should have exactly one start and one end marker');
  });
});
