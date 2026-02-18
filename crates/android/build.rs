/*
 * Build script for o19-android
 * 
 * Uses the NDK's aidl tool to generate Rust bindings from AIDL files.
 * Also strips inner attributes that don't work with include!().
 */

use std::env;
use std::path::PathBuf;
use std::process::Command;
use std::fs;

fn list_aidl_sources(dir: &PathBuf) -> Vec<PathBuf> {
    let mut sources = Vec::new();
    for entry in dir.read_dir().unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.is_dir() {
            sources.extend(list_aidl_sources(&path));
        } else if path.extension().map(|e| e == "aidl").unwrap_or(false) {
            sources.push(path);
        }
    }
    sources
}

/// Strip inner attributes that don't work with include!()
fn strip_inner_attributes(content: &str) -> String {
    content
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.starts_with("#![")  // Remove inner attributes
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn main() {
    let aidl_dir = PathBuf::from("./android/aidl");
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    
    // Tell cargo to rerun if AIDL files change
    println!("cargo:rerun-if-changed={}", aidl_dir.display());
    
    // Find NDK aidl tool
    let android_home = env::var("ANDROID_HOME").expect("ANDROID_HOME not set");
    let aidl_path = Command::new("find")
        .args(&[&format!("{}/build-tools", android_home), "-name", "aidl", "-type", "f"])
        .output()
        .ok()
        .and_then(|o| if o.status.success() { Some(o.stdout) } else { None })
        .and_then(|b| String::from_utf8(b).ok())
        .and_then(|s| s.lines().next().map(|l| l.to_string()))
        .unwrap_or_else(|| format!("{}/build-tools/35.0.1/aidl", android_home));
    
    println!("cargo:info=Using AIDL: {}", aidl_path);
    
    // Generate Rust bindings for each AIDL file
    let aidl_sources = list_aidl_sources(&aidl_dir);
    
    for aidl_file in &aidl_sources {
        println!("cargo:info=Processing: {}", aidl_file.display());
        
        let output = Command::new(&aidl_path)
            .arg("--lang=rust")
            .arg("-o")
            .arg(&out_dir)
            .arg("-I")
            .arg(&aidl_dir)
            .arg(aidl_file)
            .output()
            .expect("Failed to run NDK aidl");
        
        if !output.status.success() {
            panic!(
                "AIDL generation failed for {}:\nstdout: {}\nstderr: {}",
                aidl_file.display(),
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );
        }
    }
    
    // Strip inner attributes from generated files
    let generated_dir = out_dir.join("ty/circulari/o19");
    for entry in fs::read_dir(&generated_dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.extension().map(|e| e == "rs").unwrap_or(false) {
            let content = fs::read_to_string(&path).unwrap();
            let stripped = strip_inner_attributes(&content);
            fs::write(&path, stripped).unwrap();
            println!("cargo:info=Stripped inner attributes from: {}", path.display());
        }
    }
}
