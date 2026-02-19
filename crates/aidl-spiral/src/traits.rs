//! Generator Traits
//!
//! This module defines the core traits for code generation in aidl-spiral.
//! Each generator implements these traits to produce code for specific
//! Boundaries between Rings.
//!
//! The architecture is designed for extensibility:
//! - Add new ArtifactTypes to generate new kinds of code
//! - Implement Generator for each ArtifactType
//! - Register generators in the GeneratorRegistry

use crate::architecture::{ArtifactType, Boundary, Management, Ring};
use std::collections::HashMap;
use std::path::Path;

/// A generated artifact (file)
pub struct GeneratedArtifact {
    /// Relative path within the output directory
    pub path: String,
    
    /// File content
    pub content: String,
    
    /// Language for syntax highlighting/hints
    pub language: String,
}

/// Context for generation
pub struct GenerationContext<'a> {
    /// The management being generated
    pub management: &'a Management,
    
    /// The boundary being crossed
    pub boundary: &'a Boundary,
    
    /// Source ring
    pub from: &'a Ring,
    
    /// Target ring
    pub to: &'a Ring,
    
    /// Base output directory
    pub output_dir: &'a Path,
    
    /// Global configuration
    pub config: &'a crate::architecture::Config,
}

/// Core trait for code generators
///
/// Each generator produces code for a specific ArtifactType.
/// Generators are registered in the GeneratorRegistry and invoked
/// based on the Architecture configuration.
pub trait Generator: Send + Sync {
    /// Returns the ArtifactType this generator produces
    fn artifact_type(&self) -> ArtifactType;
    
    /// Generate code for the given context
    ///
    /// Returns a list of generated artifacts (files).
    fn generate(&self, ctx: &GenerationContext) -> Result<Vec<GeneratedArtifact>, GenerationError>;
    
    /// Check if this generator can handle the given boundary
    ///
    /// Default implementation checks if the target ring's artifact type matches.
    fn can_handle(&self, boundary: &Boundary) -> bool {
        boundary.to.artifact_type == self.artifact_type()
    }
}

/// Errors during generation
#[derive(Debug, thiserror::Error)]
pub enum GenerationError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Parse error: {0}")]
    Parse(String),
    
    #[error("Generation failed: {0}")]
    Failed(String),
    
    #[error("Unsupported boundary type: {0:?}")]
    UnsupportedBoundary(crate::architecture::BoundaryType),
    
    #[error("Missing required input: {0}")]
    MissingInput(String),
}

/// Registry of generators
///
/// Maintains a mapping from ArtifactType to Generator implementations.
/// The orchestrator uses this registry to dispatch generation requests.
pub struct GeneratorRegistry {
    generators: HashMap<ArtifactType, Box<dyn Generator>>,
}

impl GeneratorRegistry {
    /// Create a new empty registry
    pub fn new() -> Self {
        Self {
            generators: HashMap::new(),
        }
    }
    
    /// Register a generator
    pub fn register<G: Generator + 'static>(&mut self, generator: G) {
        let artifact_type = generator.artifact_type();
        self.generators.insert(artifact_type, Box::new(generator));
    }
    
    /// Get a generator for the given artifact type
    pub fn get(&self, artifact_type: &ArtifactType) -> Option<&dyn Generator> {
        self.generators.get(artifact_type).map(|g| g.as_ref())
    }
    
    /// Find a generator that can handle the given boundary
    pub fn find_for_boundary(&self, boundary: &Boundary) -> Option<&dyn Generator> {
        self.generators
            .values()
            .find(|g| g.can_handle(boundary))
            .map(|g| g.as_ref())
    }
    
    /// Create a registry with all built-in generators
    pub fn with_builtin() -> Self {
        let mut registry = Self::new();
        
        // Register built-in generators
        registry.register(generators::AidlGenerator);
        registry.register(generators::JavaStubGenerator);
        registry.register(generators::JniGenerator);
        registry.register(generators::RustServiceGenerator);
        registry.register(generators::PlatformGenerator);
        registry.register(generators::TauriCommandGenerator);
        registry.register(generators::TypeScriptGenerator);
        
        registry
    }
}

impl Default for GeneratorRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Module containing all built-in generator implementations
pub mod generators {
    use super::*;
    
    /// Generates AIDL files (Ring 0: Contract)
    ///
    /// This generator is special—it produces AIDL that can be consumed
    /// by other generators. It "reframes" the source AIDL for specific
    /// contexts (Android, pure Rust, etc.).
    pub struct AidlGenerator;
    
    impl Generator for AidlGenerator {
        fn artifact_type(&self) -> ArtifactType {
            ArtifactType::Aidl
        }
        
        fn generate(&self, ctx: &GenerationContext) -> Result<Vec<GeneratedArtifact>, GenerationError> {
            // For now, just copy the source AIDL
            // In the future, this could transform the AIDL (add annotations, etc.)
            let content = generate_aidl(&ctx.management.aidl);
            
            let filename = format!("{}.aidl", ctx.management.aidl.interface_name);
            
            Ok(vec![GeneratedArtifact {
                path: filename,
                content,
                language: "aidl".to_string(),
            }])
        }
    }
    
    /// Generates Java stubs from AIDL (Ring 1: Binding)
    pub struct JavaStubGenerator;
    
    impl Generator for JavaStubGenerator {
        fn artifact_type(&self) -> ArtifactType {
            ArtifactType::Stub
        }
        
        fn generate(&self, ctx: &GenerationContext) -> Result<Vec<GeneratedArtifact>, GenerationError> {
            // Only handle Java stubs
            if ctx.to.language != crate::architecture::Language::Java {
                return Ok(vec![]);
            }
            
            let java_stub = crate::jni_generator::generate_java_stub(&ctx.management.aidl);
            let java_client = crate::jni_generator::generate_java_client(&ctx.management.aidl);
            
            let package_path = ctx.management.aidl.package.replace('.', "/");
            let interface_name = &ctx.management.aidl.interface_name;
            let service_name = ctx.management.service_name();
            
            Ok(vec![
                GeneratedArtifact {
                    path: format!("java/{}/{}.java", package_path, interface_name),
                    content: java_stub,
                    language: "java".to_string(),
                },
                GeneratedArtifact {
                    path: format!("java/{}/service/{}Client.java", package_path, service_name),
                    content: java_client,
                    language: "java".to_string(),
                },
            ])
        }
    }
    
    /// Generates JNI glue (Ring 2: Bridge)
    pub struct JniGenerator;
    
    impl Generator for JniGenerator {
        fn artifact_type(&self) -> ArtifactType {
            ArtifactType::JniGlue
        }
        
        fn generate(&self, ctx: &GenerationContext) -> Result<Vec<GeneratedArtifact>, GenerationError> {
            use crate::jni_generator::{JniConfig, JniGenerator as InnerGenerator};
            
            let config = JniConfig {
                java_package: ctx.management.aidl.package.clone(),
                rust_crate_name: ctx.management.service_name().to_lowercase(),
                service_singleton_path: format!("crate::{}::init_service", ctx.management.service_name()),
            };
            
            let generator = InnerGenerator::new(config);
            let rust_glue = generator.generate_rust_glue(&ctx.management.aidl);
            
            let formatted = crate::generator::Generator::format_rust_code(&rust_glue.to_string());
            
            Ok(vec![GeneratedArtifact {
                path: "jni_glue.rs".to_string(),
                content: formatted,
                language: "rust".to_string(),
            }])
        }
    }
    
    /// Generates Rust service implementation template (Ring 3: Core)
    pub struct RustServiceGenerator;
    
    impl Generator for RustServiceGenerator {
        fn artifact_type(&self) -> ArtifactType {
            ArtifactType::ServiceImpl
        }
        
        fn generate(&self, ctx: &GenerationContext) -> Result<Vec<GeneratedArtifact>, GenerationError> {
            let template = crate::generator::generate_service_impl_template(&ctx.management.aidl);
            
            Ok(vec![GeneratedArtifact {
                path: "service_impl_template.rs".to_string(),
                content: template,
                language: "rust".to_string(),
            }])
        }
    }
    
    /// Generates platform trait and implementations (Ring 4: Platform)
    pub struct PlatformGenerator;
    
    impl Generator for PlatformGenerator {
        fn artifact_type(&self) -> ArtifactType {
            ArtifactType::PlatformTrait
        }
        
        fn generate(&self, ctx: &GenerationContext) -> Result<Vec<GeneratedArtifact>, GenerationError> {
            let trait_code = generate_platform_trait(&ctx.management.aidl);
            
            Ok(vec![GeneratedArtifact {
                path: "platform_trait.rs".to_string(),
                content: trait_code,
                language: "rust".to_string(),
            }])
        }
    }
    
    /// Generates Tauri command handlers (Ring 5: Interface)
    pub struct TauriCommandGenerator;
    
    impl Generator for TauriCommandGenerator {
        fn artifact_type(&self) -> ArtifactType {
            ArtifactType::TauriCommands
        }
        
        fn generate(&self, ctx: &GenerationContext) -> Result<Vec<GeneratedArtifact>, GenerationError> {
            use crate::cmd_generator::{generate_commands_module, CmdConfig};
            
            let cmd_config = CmdConfig::default();
            let commands_module = generate_commands_module(&ctx.management.aidl, &cmd_config);
            
            let formatted = crate::generator::Generator::format_rust_code(&commands_module.to_string());
            
            Ok(vec![GeneratedArtifact {
                path: "commands.rs".to_string(),
                content: formatted,
                language: "rust".to_string(),
            }])
        }
    }
    
    /// Generates TypeScript adaptors (Ring 6: Front)
    pub struct TypeScriptGenerator;
    
    impl Generator for TypeScriptGenerator {
        fn artifact_type(&self) -> ArtifactType {
            ArtifactType::TsAdaptor
        }
        
        fn generate(&self, ctx: &GenerationContext) -> Result<Vec<GeneratedArtifact>, GenerationError> {
            use crate::ts_generator::generate_all_ts;
            
            let ts_files = generate_all_ts(&ctx.management.aidl);
            
            let artifacts: Vec<GeneratedArtifact> = ts_files
                .into_iter()
                .map(|(path, content)| GeneratedArtifact {
                    path: format!("ts/adaptors/{}", path),
                    content,
                    language: "typescript".to_string(),
                })
                .collect();
            
            Ok(artifacts)
        }
    }
    
    // Helper functions for generation
    
    fn generate_aidl(aidl: &crate::parser::AidlFile) -> String {
        // For now, reconstruct the AIDL from the parsed representation
        // In the future, this could add annotations, imports, etc.
        let mut result = String::new();
        
        result.push_str(&format!("// {}.aidl\n", aidl.interface_name));
        result.push_str(&format!("package {};\n\n", aidl.package));
        
        // Add imports
        for import in &aidl.imports {
            result.push_str(&format!("import {};\n", import));
        }
        if !aidl.imports.is_empty() {
            result.push('\n');
        }
        
        // Add interface
        result.push_str(&format!("interface {} {{\n", aidl.interface_name));
        
        for method in &aidl.methods {
            // Build method signature
            let mut sig = String::new();
            
            if method.is_oneway {
                sig.push_str("    oneway ");
            } else {
                sig.push_str("    ");
            }
            
            sig.push_str(&format!("{} ", type_to_aidl(&method.return_type)));
            sig.push_str(&format!("{}(", method.name));
            
            let args: Vec<String> = method.args.iter().map(|arg| {
                let direction = match arg.direction {
                    crate::parser::ArgDirection::In => "in ",
                    crate::parser::ArgDirection::Out => "out ",
                    crate::parser::ArgDirection::InOut => "inout ",
                };
                format!("{}{} {}", direction, type_to_aidl(&arg.ty), arg.name)
            }).collect();
            
            sig.push_str(&args.join(", "));
            sig.push_str(");\n");
            
            result.push_str(&sig);
        }
        
        result.push_str("}\n");
        result
    }
    
    fn type_to_aidl(ty: &crate::parser::AidlType) -> String {
        use crate::parser::AidlType;
        match ty {
            AidlType::Void => "void".to_string(),
            AidlType::Boolean => "boolean".to_string(),
            AidlType::Byte => "byte".to_string(),
            AidlType::Char => "char".to_string(),
            AidlType::Short => "short".to_string(),
            AidlType::Int => "int".to_string(),
            AidlType::Long => "long".to_string(),
            AidlType::Float => "float".to_string(),
            AidlType::Double => "double".to_string(),
            AidlType::String => "String".to_string(),
            AidlType::Parcelable(name) => name.clone(),
            AidlType::Interface(name) => name.clone(),
            AidlType::Array(inner) => format!("{}[]", type_to_aidl(inner)),
            AidlType::List(inner) => format!("List<{}>", type_to_aidl(inner)),
            AidlType::Map(k, v) => format!("Map<{}, {}>", type_to_aidl(k), type_to_aidl(v)),
        }
    }
    
    fn generate_platform_trait(aidl: &crate::parser::AidlFile) -> String {
        let interface_name = aidl.interface_name.trim_start_matches('I');
        
        let methods: Vec<String> = aidl.methods.iter().map(|m| {
            let name = crate::generator::to_snake_case(&m.name);
            let ret = crate::generator::rust_return_type_name(&m.return_type);
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
}
