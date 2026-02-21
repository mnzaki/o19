/**
 * Gradle Block Templates
 *
 * The spool holds the thread—templates for Gradle configuration blocks.
 * These are woven into build.gradle files by the shuttle.
 */

export interface GradleBlockTemplates {
  rustBuildTask: string;
}

/**
 * Generate Rust build task block for build.gradle
 * 
 * @param taskName - Base task name (e.g., 'buildRustFoundframe')
 * @param jniLibsOutput - Output directory for JNI libs
 */
export function getRustBuildBlock(taskName: string, jniLibsOutput: string): string {
  // Derive clean task name: buildRustFoundframe → cleanRustFoundframe
  const cleanTaskName = taskName.replace(/^build/, 'clean');
  
  return `
// Rust/Cargo integration
// Requires cargo-ndk: cargo install cargo-ndk
// NOTE: Generated code only compiles for Android targets, not host!

// Task to build Rust code using cargo-ndk
tasks.register('${taskName}', Exec) {
    group = 'build'
    description = 'Build Rust code for Android targets'
    
    doFirst {
        if (!System.getenv('ANDROID_NDK_HOME') && !System.getenv('ANDROID_NDK_ROOT')) {
            throw new GradleException(
                'ANDROID_NDK_HOME or ANDROID_NDK_ROOT not set!\\n' +
                'Install NDK: sdkmanager "ndk;27.0.12077973"\\n' +
                'Then set: export ANDROID_NDK_HOME=\\$ANDROID_HOME/ndk/27.0.12077973'
            )
        }
    }
    
    commandLine 'cargo', 'ndk',
        '-t', 'arm64-v8a',
        '-t', 'x86_64',
        '-o', '${jniLibsOutput}',
        'build', '--release'
    
    onlyIf {
        file('Cargo.toml').exists()
    }
    
    inputs.files(fileTree('src').include('**/*.rs'))
    inputs.file('Cargo.toml')
    outputs.dir('${jniLibsOutput}')
}

preBuild.dependsOn ${taskName}

tasks.register('${cleanTaskName}', Delete) {
    group = 'build'
    description = 'Clean Rust build artifacts'
    delete '${jniLibsOutput}'
}
clean.dependsOn ${cleanTaskName}
`;
}
