//! Code Generator based on Architecture model
//!
//! This module ties together the architecture model with the existing generators,
//! routing generation requests based on Rings and Boundaries.

use crate::architecture::{Architecture, ArtifactType, Boundary, BoundaryType, Management, Ring};
use crate::jni_generator::{generate_java_stub, generate_java_client};
use crate::ts_generator::generate_all_ts;
use crate::cmd_generator::{generate_commands_module, CmdConfig};
use proc_macro2::TokenStream;
use std::fs;
use std::path::{Path, PathBuf};

/// Errors that can occur during generation
#[derive(Debug, thiserror::Error)]
pub enum GenerationError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Generation error: {0}")]
    Generation(String),
    
    #[error("Unknown boundary type: {0}")]
    UnknownBoundaryType(String),
    
    #[error("Missing ring: {0}")]
    MissingRing(String),
}

/// The main generator that orchestrates code generation based on Architecture
pub struct Generator {
    architecture: Architecture,
    output_dir: PathBuf,
}

impl Generator {
    /// Create a new Generator
    pub fn new(architecture: Architecture, output_dir: impl AsRef<Path>) -> Self {
        Self {
            architecture,
            output_dir: output_dir.as_ref().to_path_buf(),
        }
    }
    
    /// Generate all code for the architecture
    pub fn generate_all(&self) -> Result<(), GenerationError> {
        fs::create_dir_all(&self.output_dir)?;
        
        // Generate code for each Management across all Rings
        for mgmt in &self.architecture.managements {
            self.generate_management(mgmt)?;
        }
        
        // Generate per-Ring artifacts (not specific to a Management)
        self.generate_ring_artifacts()?;
        
        Ok(())
    }
    
    /// Generate all code for a single Management
    fn generate_management(&self, mgmt: &Management) -> Result<(), GenerationError> {
        let mgmt_output_dir = self.output_dir.join(&mgmt.name);
        fs::create_dir_all(&mgmt_output_dir)?;
        
        // Get all boundaries for this Management
        let boundaries = self.architecture.boundaries_for(mgmt);
        
        for boundary in boundaries {
            self.generate_boundary(&boundary, &mgmt_output_dir)?;
        }
        
        Ok(())
    }
    
    /// Generate code for a specific Boundary
    fn generate_boundary(
        &self,
        boundary: &Boundary,
        output_dir: &Path,
    ) -> Result<(), GenerationError> {
        // Find the Management this boundary serves
        let mgmt = self.architecture.managements.iter()
            .find(|m| m.name == boundary.management_name)
            .ok_or_else(|| GenerationError::Generation(
                format!("Management not found: {}", boundary.management_name)
            ))?;
        
        // Generate based on the boundary type and target ring
        match (&boundary.to.artifact_type, &boundary.boundary_type) {
            // Generate Java stub from AIDL
            (ArtifactType::Stub, BoundaryType::AidlToJava) => {
                self.generate_java_stub(mgmt, output_dir)?;
            }
            
            // Generate Kotlin stub from AIDL
            (ArtifactType::Stub, BoundaryType::AidlToKotlin) => {
                // TODO: Add Kotlin generator
                self.generate_java_stub(mgmt, output_dir)?;
            }
            
            // Generate JNI glue
            (ArtifactType::JniGlue, _) => {
                self.generate_jni_glue(mgmt, output_dir)?;
            }
            
            // Generate service implementation template
            (ArtifactType::ServiceImpl, _) => {
                self.generate_service_template(mgmt, output_dir)?;
            }
            
            // Generate platform trait
            (ArtifactType::PlatformTrait, _) => {
                self.generate_platform_trait(mgmt, output_dir)?;
            }
            
            // Generate Tauri commands
            (ArtifactType::TauriCommands, _) => {
                self.generate_tauri_commands(mgmt, output_dir)?;
            }
            
            // Generate TypeScript adaptors
            (ArtifactType::TsAdaptor, _) => {
                self.generate_ts_adaptors(mgmt, output_dir)?;
            }
            
            _ => {
                // Skip artifact types we don't handle yet
            }
        }
        
        Ok(())
    }
    
    /// Generate Java stub for a Management
    fn generate_java_stub(
        &self,
        mgmt: &Management,
        output_dir: &Path,
    ) -> Result<(), GenerationError> {
        let java_stub = generate_java_stub(&mgmt.aidl);
        
        let java_package_dir = mgmt.aidl.package.replace('.', "/");
        let java_output_dir = output_dir.join("java").join(&java_package_dir);
        fs::create_dir_all(&java_output_dir)?;
        
        let java_file_name = format!("{}.java", mgmt.aidl.interface_name);
        fs::write(java_output_dir.join(&java_file_name), java_stub)?;
        
        // Also generate the client
        let java_client = generate_java_client(&mgmt.aidl);
        let java_service_dir = java_output_dir.join("service");
        fs::create_dir_all(&java_service_dir)?;
        
        let client_class_name = mgmt.service_name() + "Client.java";
        fs::write(java_service_dir.join(&client_class_name), java_client)?;
        
        Ok(())
    }
    
    /// Generate JNI glue for a Management
    fn generate_jni_glue(
        &self,
        mgmt: &Management,
        output_dir: &Path,
    ) -> Result<(), GenerationError> {
        use crate::jni_generator::{JniConfig, JniGenerator};
        
        let config = JniConfig {
            java_package: mgmt.aidl.package.clone(),
            rust_crate_name: mgmt.service_name().to_lowercase(),
            service_singleton_path: format!("crate::{}::init_service", mgmt.service_name()),
        };
        
        let generator = JniGenerator::new(config);
        let rust_glue = generator.generate_rust_glue(&mgmt.aidl);
        
        fs::write(
            output_dir.join("jni_glue.rs"),
            Self::format_rust_code(&rust_glue.to_string())
        )?;
        
        Ok(())
    }
    
    /// Generate service implementation template
    fn generate_service_template(
        &self,
        mgmt: &Management,
        output_dir: &Path,
    ) -> Result<(), GenerationError> {
        let template = generate_service_impl_template(&mgmt.aidl);
        fs::write(output_dir.join("service_impl_template.rs"), template)?;
        Ok(())
    }
    
    /// Generate platform trait
    fn generate_platform_trait(
        &self,
        mgmt: &Management,
        output_dir: &Path,
    ) -> Result<(), GenerationError> {
        // TODO: Implement platform trait generator
        // For now, create a placeholder
        let trait_code = generate_platform_trait_placeholder(&mgmt.aidl);
        fs::write(output_dir.join("platform_trait.rs"), trait_code)?;
        Ok(())
    }
    
    /// Generate Tauri commands
    fn generate_tauri_commands(
        &self,
        mgmt: &Management,
        output_dir: &Path,
    ) -> Result<(), GenerationError> {
        let cmd_config = CmdConfig::default();
        let commands_module = generate_commands_module(&mgmt.aidl, &cmd_config);
        
        fs::write(
            output_dir.join("commands.rs"),
            Self::format_rust_code(&commands_module.to_string())
        )?;
        
        Ok(())
    }
    
    /// Generate TypeScript adaptors
    fn generate_ts_adaptors(
        &self,
        mgmt: &Management,
        output_dir: &Path,
    ) -> Result<(), GenerationError> {
        let ts_files = generate_all_ts(&mgmt.aidl);
        let ts_output_dir = output_dir.join("ts").join("adaptors");
        fs::create_dir_all(&ts_output_dir)?;
        
        for (filename, content) in ts_files {
            let filepath = ts_output_dir.join(&filename);
            if let Some(parent) = filepath.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::write(filepath, content)?;
        }
        
        Ok(())
    }
    
    /// Generate per-Ring artifacts (not specific to a Management)
    fn generate_ring_artifacts(&self) -> Result<(), GenerationError> {
        // Generate architecture README
        let readme = self.generate_readme();
        fs::write(self.output_dir.join("README.md"), readme)?;
        
        Ok(())
    }
    
    /// Generate a README explaining the architecture
    fn generate_readme(&self) -> String {
        let mut rings_list = String::new();
        for ring in &self.architecture.rings {
            rings_list.push_str(&format!(
                "- **{}** ({}): {}\n",
                ring.name,
                ring.language.extension(),
                ring.description
            ));
        }
        
        let mut mgmt_list = String::new();
        for mgmt in &self.architecture.managements {
            mgmt_list.push_str(&format!("- {}\n", mgmt.name));
        }
        
        format!(r#"# Generated Code Architecture

> Auto-generated from AIDL. Do not edit manually.

## Architecture

### Rings (Horizontal Concerns)

{}

### Managements (Vertical Domains)

{}

## Regeneration

To regenerate from AIDL:

```bash
aidl-spiral -i /path/to/aidl -o {}
```

---

*Generated by aidl-spiral - Spiral architecture*
"#,
            rings_list,
            mgmt_list,
            self.output_dir.display()
        )
    }
    
    /// Format Rust code using prettyplease
    fn format_rust_code(code: &str) -> String {
        match syn::parse_file(code) {
            Ok(file) => prettyplease::unparse(&file),
            Err(_) => code.to_string(),
        }
    }
}

/// Generate a service implementation template
fn generate_service_impl_template(aidl: &crate::parser::AidlFile) -> String {
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
        method_impls = method_impls.join("\n"),
    )
}

fn generate_method_template(method: &crate::parser::AidlMethod) -> String {
    use crate::parser::AidlType;
    
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
        r#"    fn {method_name}(&self, {args}) -> {ret_type} {{
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

fn rust_return_type_name(ty: &crate::parser::AidlType) -> &'static str {
    use crate::parser::AidlType;
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

fn rust_arg_type_name(ty: &crate::parser::AidlType) -> String {
    use crate::parser::AidlType;
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

/// Generate a placeholder platform trait
fn generate_platform_trait_placeholder(aidl: &crate::parser::AidlFile) -> String {
    let interface_name = aidl.interface_name.trim_start_matches('I');
    
    let methods: Vec<String> = aidl.methods.iter().map(|m| {
        let name = to_snake_case(&m.name);
        let ret = rust_return_type_name(&m.return_type);
        format!("    async fn {}(&self) -> {};", name, ret)
    }).collect();
    
    format!(
        r#"//! Platform Trait
//!
//! Auto-generated from {}

#[async_trait::async_trait]
pub trait {}: Send + Sync {{
{}
}}
"#,
        aidl.interface_name,
        interface_name,
        methods.join("\n")
    )
}
