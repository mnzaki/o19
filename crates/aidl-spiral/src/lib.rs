//! AIDL-to-JNI Code Generator
//!
//! This crate provides code generation for bridging AIDL interfaces between
//! Android Java and Rust via JNI.
//!
//! ## The Spiral Architecture
//!
//! aidl-spiral uses a declarative model based on **Rings** and **Managements**:
//!
//! - **Ring**: A horizontal concern that spans all Managements (Contract, Binding, Bridge, Core, etc.)
//! - **Management**: A vertical domain (BookmarkMgmt, PostMgmt, PersonMgmt)
//! - **Boundary**: The generated code that connects two Rings for a Management
//!
//! The architecture is itself defined in AIDL via `meta.aidl`—the spiral eats its own tail.
//!
//! ## Usage
//!
//! In your `build.rs`:
//!
//! ```rust
//! use aidl_spiral::{generate_from_aidl, JniConfig};
//!
//! fn main() {
//!     let config = JniConfig {
//!         java_package: "ty.circulari.o19".to_string(),
//!         rust_crate_name: "my_service".to_string(),
//!         service_singleton_path: "crate::MyService".to_string(),
//!     };
//!     
//!     generate_from_aidl(
//!         "src/aidl/IFoundframeRadicle.aidl",
//!         &config,
//!         "src/generated/",
//!     ).expect("Code generation failed");
//! }
//! ```

pub mod parser;
pub mod jni_generator;
pub mod ts_generator;
pub mod cmd_generator;
pub mod architecture;
pub mod meta_parser;
pub mod generator;
pub mod workspace;
pub mod traits;

// Re-export commonly used types
pub use architecture::{Architecture, Management, Ring, Boundary, ArtifactType};
pub use traits::{Generator, GenerationContext, GeneratedArtifact, GenerationError, GeneratorRegistry};

use jni_generator::{generate_java_stub, generate_java_client, JniConfig, JniGenerator};
use ts_generator::generate_all_ts;
use cmd_generator::{generate_commands_module, CmdConfig};
use parser::AidlParser;
use std::fs;
use std::path::Path;

/// Generate all code artifacts from an AIDL file
///
/// # Arguments
/// * `aidl_path` - Path to the AIDL file
/// * `config` - Configuration for code generation
/// * `output_dir` - Directory to write generated files (created if needed)
///
/// # Generated Files (in `{output_dir}/`)
/// * `jni_glue.rs` - Rust JNI glue code
/// * `service_impl_template.rs` - Rust implementation template
/// * `java/<package>/{Interface}.java` - Java AIDL interface
/// * `java/<package>/service/{Interface}Client.java` - Java client helper
/// * `ts/adaptors/index.ts` - TypeScript adaptor exports
/// * `ts/adaptors/generated/*.adaptor.ts` - TypeScript entity adaptors
pub fn generate_from_aidl(
    aidl_path: impl AsRef<Path>,
    config: &JniConfig,
    output_dir: impl AsRef<Path>,
) -> Result<(), Box<dyn std::error::Error>> {
    let aidl_content = fs::read_to_string(&aidl_path)?;
    let parser = AidlParser::new();
    let aidl_file = parser.parse(&aidl_content)?;

    let output_dir = output_dir.as_ref();
    fs::create_dir_all(output_dir)?;

    // Generate Rust JNI glue
    let generator = JniGenerator::new(config.clone());
    let rust_glue = generator.generate_rust_glue(&aidl_file);
    
    let rust_output = rust_glue.to_string();
    fs::write(output_dir.join("jni_glue.rs"), format_rust_code(&rust_output))?;

    // Generate Java stub (interface)
    let java_stub = generate_java_stub(&aidl_file);
    
    // Create package directory structure
    let java_package_dir = aidl_file.package.replace('.', "/");
    let java_output_dir = output_dir.join("java").join(&java_package_dir);
    fs::create_dir_all(&java_output_dir)?;
    
    let java_file_name = format!("{}.java", aidl_file.interface_name);
    fs::write(java_output_dir.join(&java_file_name), java_stub)?;

    // Generate Java client helper
    let java_client = generate_java_client(&aidl_file);
    let java_service_dir = java_output_dir.join("service");
    fs::create_dir_all(&java_service_dir)?;
    
    let client_class_name = aidl_file.interface_name.trim_start_matches('I').to_string() + "Client.java";
    fs::write(java_service_dir.join(&client_class_name), java_client)?;

    // Generate trait implementation template
    let trait_template = generate_trait_template(&aidl_file);
    fs::write(output_dir.join("service_impl_template.rs"), trait_template)?;

    // Generate TypeScript adaptors
    let ts_files = generate_all_ts(&aidl_file);
    let ts_output_dir = output_dir.join("ts").join("adaptors");
    fs::create_dir_all(&ts_output_dir)?;
    
    for (filename, content) in ts_files {
        let filepath = ts_output_dir.join(&filename);
        if let Some(parent) = filepath.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(filepath, content)?;
    }

    // Generate Tauri commands
    let cmd_config = CmdConfig::default();
    let commands_module = generate_commands_module(&aidl_file, &cmd_config);
    fs::write(output_dir.join("commands.rs"), format_rust_code(&commands_module.to_string()))?;

    // Also write a README in the output dir explaining the structure
    let readme = generate_readme(&aidl_file);
    fs::write(output_dir.join("README.md"), readme)?;

    println!("cargo:rerun-if-changed={}", aidl_path.as_ref().display());

    Ok(())
}

/// Generate a trait implementation template for the user to fill in
fn generate_trait_template(aidl: &parser::AidlFile) -> String {
    let interface_name = aidl.interface_name.trim_start_matches('I');
    let service_impl_name = format!("{}Impl", interface_name);
    
    let method_impls: Vec<String> = aidl
        .methods
        .iter()
        .map(|m| generate_method_template(m))
        .collect();

    format!(
        r#"//! Service Implementation Template
//!
//! Copy this file and implement the methods for your service.

use crate::generated::jni_glue::{{{trait_name}, init_service}};

/// Your service implementation
pub struct {service_impl_name} {{
    // Add your fields here
}}

impl {service_impl_name} {{
    pub fn new() -> Self {{
        Self {{
            // Initialize fields
        }}
    }}
}}

impl {trait_name} for {service_impl_name} {{
    {method_impls}
}}

/// Call this to initialize the service before any AIDL calls
pub fn init() {{
    init_service({service_impl_name}::new());
}}
"#,
        trait_name = interface_name,
        service_impl_name = service_impl_name,
        method_impls = method_impls.join("\n\n    "),
    )
}

fn generate_method_template(method: &parser::AidlMethod) -> String {
    use parser::AidlType;
    
    let method_name = to_snake_case(&method.name);
    
    let args: Vec<String> = method
        .args
        .iter()
        .map(|arg| {
            let ty = rust_arg_type_name(&arg.ty);
            format!("_{}: {}", arg.name, ty)
        })
        .collect();

    let default_return = match &method.return_type {
        AidlType::Void => "",
        AidlType::String => r#"Ok(String::new())"#,
        AidlType::Boolean => "Ok(false)",
        AidlType::Int => "Ok(0)",
        AidlType::Long => "Ok(0)",
        AidlType::Byte => "Ok(0)",
        AidlType::Short => "Ok(0)",
        AidlType::Float => "Ok(0.0)",
        AidlType::Double => "Ok(0.0)",
        AidlType::Char => "Ok(0)",
        AidlType::List(_) => "Ok(vec![])",
        _ => "Ok(())",
    };

    format!(
        r#"fn {method_name}(&self, {args}) -> {ret_type} {{
        // TODO: Implement {original_name}
        {default_return}
    }}"#,
        method_name = method_name,
        args = args.join(", "),
        original_name = method.name,
        ret_type = rust_return_type_name(&method.return_type),
        default_return = if matches!(method.return_type, AidlType::Void) {
            ""
        } else {
            default_return
        },
    )
}

fn rust_return_type_name(ty: &parser::AidlType) -> &'static str {
    use parser::AidlType;
    match ty {
        AidlType::Void => "()",
        AidlType::String => "Result<String, Box<dyn std::error::Error>>",
        AidlType::Boolean => "Result<bool, Box<dyn std::error::Error>>",
        AidlType::Int => "Result<i32, Box<dyn std::error::Error>>",
        AidlType::Long => "Result<i64, Box<dyn std::error::Error>>",
        AidlType::Byte => "Result<i8, Box<dyn std::error::Error>>",
        AidlType::Short => "Result<i16, Box<dyn std::error::Error>>",
        AidlType::Float => "Result<f32, Box<dyn std::error::Error>>",
        AidlType::Double => "Result<f64, Box<dyn std::error::Error>>",
        AidlType::Char => "Result<u16, Box<dyn std::error::Error>>",
        _ => "Result<(), Box<dyn std::error::Error>>",
    }
}

fn rust_arg_type_name(ty: &parser::AidlType) -> String {
    use parser::AidlType;
    match ty {
        AidlType::String => "&str".to_string(),
        AidlType::Boolean => "bool".to_string(),
        AidlType::Int => "i32".to_string(),
        AidlType::Long => "i64".to_string(),
        AidlType::Byte => "i8".to_string(),
        AidlType::Short => "i16".to_string(),
        AidlType::Float => "f32".to_string(),
        AidlType::Double => "f64".to_string(),
        AidlType::Char => "u16".to_string(),
        AidlType::Parcelable(name) => format!("&{}", name),
        _ => "/* TODO: Complex type */".to_string(),
    }
}

fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    let chars: Vec<char> = s.chars().collect();
    
    for (i, c) in chars.iter().enumerate() {
        if c.is_uppercase() {
            if i > 0 {
                result.push('_');
            }
            result.push(c.to_lowercase().next().unwrap());
        } else {
            result.push(*c);
        }
    }
    
    result
}

/// Format Rust code using prettyplease
fn format_rust_code(code: &str) -> String {
    // Parse the code and format it with prettyplease
    match syn::parse_file(code) {
        Ok(file) => prettyplease::unparse(&file),
        Err(_) => {
            // If parsing fails, return the original code
            // (might be a partial file or have syntax issues)
            code.to_string()
        }
    }
}

/// Generate a build script helper that can be used in build.rs
pub fn build_script_main(aidl_files: &[&str], config: &JniConfig) -> Result<(), Box<dyn std::error::Error>> {
    let out_dir = std::env::var("OUT_DIR")?;
    let generated_dir = std::path::Path::new(&out_dir).join("generated");
    
    for aidl_file in aidl_files {
        generate_from_aidl(aidl_file, config, generated_dir.to_str().unwrap())?;
    }
    
    // Print cargo instructions
    println!("cargo:rustc-env=AIDL_GENERATED_DIR={}", generated_dir.display());
    
    Ok(())
}


/// Generate a README for the output directory
fn generate_readme(aidl: &parser::AidlFile) -> String {
    let interface_name = &aidl.interface_name;
    let package = &aidl.package;
    
    format!(
        r#"# Generated Code: {interface_name}

> Auto-generated from AIDL. Do not edit manually.

## Source

**AIDL File**: `{interface_name}.aidl`  
**Package**: `{package}`

## Structure

```
.
├── jni_glue.rs              # Rust JNI exports + Service trait
├── service_impl_template.rs # Implementation skeleton (copy & fill)
├── java/{pkg}/
│   ├── {interface_name}.java           # AIDL interface
│   └── service/{service_name}Client.java # Client helper
└── ts/adaptors/
    ├── index.ts              # Factory function
    └── generated/
        └── *.adaptor.ts      # TypeScript entity adaptors
```

## Usage

### Rust (Service Implementation)

1. Copy `service_impl_template.rs` to your source
2. Implement the `{trait_name}` trait
3. Initialize in `JNI_OnLoad`:

```rust
#[no_mangle]
pub extern "C" fn JNI_OnLoad(_vm: JavaVM, _reserved: c_void) -> jint {{
    service_impl::init();
    JNI_VERSION_1_6
}}
```

### Java (Android)

Use the generated client:

```java
FoundframeRadicleClient client = new FoundframeRadicleClient(context);
if (client.ensureStarted("my-alias")) {{
    // Service is ready
}}
```

### TypeScript (Frontend)

```typescript
import {{ createTauriAdaptors }} from './adaptors';

const adaptors = createTauriAdaptors(db);
const bookmark = await adaptors.bookmark.create({{
  url: "https://...",
  title: "My Bookmark"
}});
```

## Regeneration

To regenerate from AIDL:

```bash
aidl-spiral -i /path/to/aidl -o /path/to/gen
```

Or with defaults (./aidl → ./gen):

```bash
aidl-spiral
```

---

*Generated by aidl-spiral - Spiral architecture for circulari.ty*
"#,
        interface_name = interface_name,
        pkg = package.replace('.', "/"),
        service_name = interface_name.trim_start_matches('I'),
        trait_name = interface_name.trim_start_matches('I')
    )
}
