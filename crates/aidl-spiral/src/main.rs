//! aidl-spiral - Spiral generation from AIDL
//!
//! Usage: aidl-spiral [options]
//!
//! Defaults:
//!   - Input:  ./aidl/ (*.aidl files)
//!   - Output: ./gen/
//!
//! The spiral generates from AIDL to all layers:
//!   AIDL → Rust (JNI) + Java (Android) + TypeScript (Frontend)
//!
//! ## Architecture Configuration (meta.aidl)
//!
//! aidl-spiral can read a `meta.aidl` file that defines the Rings and
//! Managements for your project. The architecture is itself defined in AIDL.
//!
//! Example meta.aidl:
//! ```aidl
//! package aidl.config;
//!
//! interface IMetaArchitecture {
//!     Ring[] getRings();
//!     String[] getManagements();
//!     Config getConfig();
//! }
//!
//! parcelable Ring { String name; int order; String artifactType; String language; }
//! parcelable Config { String projectName; String basePackage; }
//! ```

use aidl_spiral::{generate_from_aidl, jni_generator::JniConfig};
use aidl_spiral::architecture::{Architecture, Management};
use aidl_spiral::generator::Generator;
use aidl_spiral::meta_parser::MetaParser;
use aidl_spiral::hookup::HookupContext;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn main() {
    let args: Vec<String> = env::args().collect();
    
    // Parse simple flags
    let mut input_dir: PathBuf = "./aidl".into();
    let mut output_dir: PathBuf = "./gen".into();
    let mut verbose = false;
    let mut hookup = false;
    let mut package_dir: Option<PathBuf> = None;
    
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "-i" | "--input" => {
                i += 1;
                if i < args.len() {
                    input_dir = args[i].clone().into();
                }
            }
            "-o" | "--output" => {
                i += 1;
                if i < args.len() {
                    output_dir = args[i].clone().into();
                }
            }
            "-v" | "--verbose" => verbose = true,
            "--hookup" => hookup = true,
            "-p" | "--package" => {
                i += 1;
                if i < args.len() {
                    package_dir = Some(args[i].clone().into());
                }
            }
            "-h" | "--help" => {
                print_help();
                return;
            }
            _ => {}
        }
        i += 1;
    }
    
    // Validate input directory
    if !input_dir.exists() {
        eprintln!("❌ Input directory not found: {}", input_dir.display());
        eprintln!("   Create ./aidl/ or specify with -i <path>");
        std::process::exit(1);
    }
    
    // Find all AIDL files
    let aidl_files = find_aidl_files(&input_dir);
    
    if aidl_files.is_empty() {
        eprintln!("❌ No .aidl files found in: {}", input_dir.display());
        std::process::exit(1);
    }
    
    if verbose {
        println!("🔍 Found {} AIDL file(s) in {}", aidl_files.len(), input_dir.display());
        for file in &aidl_files {
            println!("   • {}", file.display());
        }
    }
    
    // Create output directory
    fs::create_dir_all(&output_dir).expect("Failed to create output directory");
    
    // Check for meta.aidl - if it exists, use architecture-based generation
    let meta_path = input_dir.join("meta.aidl");
    let total_files = if meta_path.exists() {
        if verbose {
            println!("📐 Found meta.aidl - using architecture-based generation");
        }
        generate_with_architecture(&meta_path, &input_dir, &output_dir, verbose)
    } else {
        // Fall back to legacy generation
        generate_legacy(&aidl_files, &output_dir, verbose)
    };
    
    // Apply hookup if requested
    if hookup {
        if let Some(pkg_dir) = package_dir {
            if verbose {
                println!("\n🔗 Applying hookup for package: {}", pkg_dir.display());
            }
            apply_hookup(&pkg_dir, &output_dir, verbose);
        } else {
            eprintln!("⚠️  --hookup requires -p/--package <dir>");
        }
    }
    
    // Summary
    println!("\n✨ Spiral complete!");
    println!("   📁 Input:  {}/", input_dir.display());
    println!("   📁 Output: {}/", output_dir.display());
    println!("   📝 AIDL files: {}", aidl_files.len());
    println!("   📄 Generated files: {}", total_files);
    
    if verbose {
        println!("\nGenerated structure:");
        for aidl_file in &aidl_files {
            let name = aidl_file.file_stem().unwrap().to_string_lossy();
            println!("  {}/", name);
            println!("    ├── README.md");
            println!("    ├── jni_glue.rs");
            println!("    ├── service_impl_template.rs");
            println!("    ├── java/<package>/*.java");
            println!("    └── ts/adaptors/*.ts");
        }
    }
}

fn find_aidl_files(dir: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "aidl" {
                        files.push(path);
                    }
                }
            } else if path.is_dir() {
                // Recurse into subdirectories
                files.extend(find_aidl_files(&path));
            }
        }
    }
    
    files.sort();
    files
}

fn count_generated_files(dir: &Path) -> usize {
    let mut count = 0;
    
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                count += 1;
            } else if path.is_dir() {
                count += count_generated_files(&path);
            }
        }
    }
    
    count
}

/// Generate code using the new architecture-based approach
fn generate_with_architecture(
    meta_path: &Path,
    input_dir: &Path,
    output_dir: &Path,
    verbose: bool,
) -> usize {
    // Parse meta.aidl
    let meta_content = fs::read_to_string(meta_path).expect("Failed to read meta.aidl");
    let parser = MetaParser::new();
    
    match parser.parse_with_managements(&meta_content, input_dir) {
        Ok(architecture) => {
            if verbose {
                println!("📊 Architecture: {} managements across {} rings",
                    architecture.managements.len(),
                    architecture.rings.len()
                );
                for ring in &architecture.rings {
                    println!("   Ring {}: {} ({:?})", ring.order, ring.name, ring.language);
                }
            }
            
            // Generate all code
            let generator = Generator::new(architecture, output_dir);
            match generator.generate_all() {
                Ok(_) => {
                    if verbose {
                        println!("✅ Generation complete");
                    }
                    count_generated_files(output_dir)
                }
                Err(e) => {
                    eprintln!("❌ Generation failed: {}", e);
                    0
                }
            }
        }
        Err(e) => {
            eprintln!("❌ Failed to parse meta.aidl: {}", e);
            0
        }
    }
}

/// Generate code using the legacy approach (per-file)
fn generate_legacy(
    aidl_files: &[PathBuf],
    output_dir: &Path,
    verbose: bool,
) -> usize {
    let config = JniConfig::default();
    let mut total_files = 0;
    
    for aidl_file in aidl_files {
        // Skip meta.aidl in legacy mode
        if aidl_file.file_stem().map(|s| s == "meta").unwrap_or(false) {
            continue;
        }
        
        if verbose {
            println!("\n🌀 Generating from: {}", aidl_file.display());
        }
        
        // Create a subdirectory per interface
        let interface_name = aidl_file
            .file_stem()
            .unwrap()
            .to_string_lossy()
            .to_string();
        let interface_output = output_dir.join(&interface_name);
        
        match generate_from_aidl(aidl_file, &config, &interface_output) {
            Ok(_) => {
                if verbose {
                    println!("   ✅ Generated in: {}/", interface_output.display());
                }
                total_files += count_generated_files(&interface_output);
            }
            Err(e) => {
                eprintln!("   ❌ Failed: {}", e);
            }
        }
    }
    
    total_files
}

/// Apply hookup to integrate generated code into a package
fn apply_hookup(package_dir: &Path, _output_dir: &Path, verbose: bool) {
    use aidl_spiral::hookup::{HookupRegistry, HookupContext};
    use std::collections::HashMap;
    
    let registry = HookupRegistry::with_builtin();
    let context = HookupContext {
        package_name: package_dir.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        management_name: "all".to_string(),
        target_ring: "all".to_string(),
        language: "rust".to_string(),
        config: HashMap::new(),
    };
    
    // Apply ALL hookup methods that can_apply (including GitignoreHookup)
    let mut applied = Vec::new();
    for method in registry.methods.iter() {
        if method.can_apply(package_dir) {
            match method.apply(package_dir, &[], &context) {
                Ok(_) => {
                    applied.push(method.name());
                }
                Err(e) => {
                    if verbose {
                        eprintln!("   ⚠️  Hookup '{}' failed: {}", method.name(), e);
                    }
                }
            }
        }
    }
    
    if verbose && !applied.is_empty() {
        println!("   ✅ Applied hookups: {}", applied.join(", "));
    }
}

fn print_help() {
    println!("aidl-spiral - Spiral generation from AIDL");
    println!();
    println!("Usage: aidl-spiral [OPTIONS]");
    println!();
    println!("Options:");
    println!("  -i, --input <dir>   Input directory (default: ./aidl)");
    println!("  -o, --output <dir>  Output directory (default: ./gen)");
    println!("  -p, --package <dir> Package directory for hookup");
    println!("      --hookup        Auto-integrate generated code into package");
    println!("  -v, --verbose       Show detailed output");
    println!("  -h, --help          Print this help");
    println!();
    println!("Defaults:");
    println!("  • Reads .aidl files from ./aidl/");
    println!("  • Generates code to ./gen/<InterfaceName>/");
    println!();
    println!("Hookup Examples:");
    println!("  aidl-spiral -i aidl -o gen/ -p crates/my-crate --hookup");
    println!("    Auto-integrates generated code into the Rust crate");
    println!();
    println!("Architecture Configuration:");
    println!("  If meta.aidl exists in the input directory, it defines the architecture:");
    println!("    • Rings: horizontal concerns (Contract, Binding, Bridge, Core, ...)");
    println!("    • Managements: vertical domains (BookmarkMgmt, PostMgmt, ...)");
    println!("  See RING_LAYER_ANALYSIS.md for details.");
    println!();
    println!("Output structure per interface:");
    println!("  ./gen/<Interface>/");
    println!("    ├── jni_glue.rs              # Rust JNI + Service trait");
    println!("    ├── service_impl_template.rs # Rust impl skeleton");
    println!("    ├── commands.rs              # Tauri command handlers");
    println!("    ├── java/<pkg>/              # Java AIDL + Client");
    println!("    └── ts/adaptors/             # TypeScript adaptors");
}
