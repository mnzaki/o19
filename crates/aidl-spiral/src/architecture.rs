//! Architecture Model: Rings, Managements, Boundaries
//!
//! The heart of aidl-spiral: a declarative model for cross-platform code generation.
//!
//! ## Core Concepts
//!
//! - **Ring**: A horizontal concern that spans all Managements (Contract, Binding, Bridge, Core, etc.)
//! - **Management**: A vertical domain (BookmarkMgmt, PostMgmt, PersonMgmt)
//! - **Boundary**: The generated code that connects two adjacent Rings for a given Management
//! - **BoundaryType**: How the connection is made (AIDL, JNI, TauriCommand, Direct, etc.)
//!
//! ## The Flow
//!
//! 1. Parse `meta.aidl` → `Architecture` (defines Rings and their connections)
//! 2. Parse `*.aidl` → `Vec<Management>` (defines what each Management does)
//! 3. For each Management, walk the Ring graph and generate Boundaries
//!
//! The spiral generates its own structure.

use std::collections::HashMap;

/// A Ring is a horizontal concern that spans all Managements.
/// 
/// Rings are ordered from innermost (closest to the source of truth) to outermost
/// (closest to the user). Each Ring represents a layer of abstraction or
/// translation in the architecture.
///
/// Example Rings:
/// - Contract (Ring 0): AIDL definitions
/// - Binding (Ring 1): Language-specific stubs
/// - Bridge (Ring 2): JNI, FFI, serialization
/// - Core (Ring 3): Pure domain implementation
/// - Platform (Ring 4): Deployment context
/// - Interface (Ring 5): API surface (commands, events)
/// - Front (Ring 6): User-facing adaptation
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Ring {
    /// Unique identifier for this Ring (e.g., "Contract", "Binding")
    pub name: String,
    
    /// Order in the Ring hierarchy (0 = innermost)
    pub order: u8,
    
    /// What this Ring produces
    pub artifact_type: ArtifactType,
    
    /// The target language for artifacts in this Ring
    pub language: Language,
    
    /// Description for documentation
    pub description: String,
}

impl Ring {
    /// Create a new Ring
    pub fn new(name: impl Into<String>, order: u8, artifact_type: ArtifactType, language: Language) -> Self {
        Self {
            name: name.into(),
            order,
            artifact_type,
            language,
            description: String::new(),
        }
    }
    
    /// Check if this Ring is adjacent to another
    pub fn is_adjacent_to(&self, other: &Ring) -> bool {
        let diff = if self.order > other.order {
            self.order - other.order
        } else {
            other.order - self.order
        };
        diff == 1
    }
    
    /// Returns true if this Ring is closer to the center than another
    pub fn is_inner(&self, other: &Ring) -> bool {
        self.order < other.order
    }
}

/// Types of artifacts that can be generated
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ArtifactType {
    /// AIDL interface definition
    Aidl,
    /// Language-specific stub (Java interface, Rust trait, etc.)
    Stub,
    /// Client helper for connecting to a service
    Client,
    /// JNI glue code
    JniGlue,
    /// FFI bindings
    Ffi,
    /// Service implementation template
    ServiceImpl,
    /// Platform abstraction trait
    PlatformTrait,
    /// Platform implementation
    PlatformImpl,
    /// Tauri command handlers
    TauriCommands,
    /// TypeScript adaptor
    TsAdaptor,
    /// TypeScript index/exports
    TsIndex,
    /// Custom artifact type
    Custom(String),
}

/// Programming languages supported
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Language {
    InterfaceDefinition,  // AIDL (renamed to avoid conflict with ArtifactType::Aidl)
    Java,
    Kotlin,
    Rust,
    TypeScript,
    Swift,
}

impl Language {
    /// File extension for this language
    pub fn extension(&self) -> &'static str {
        match self {
            Language::InterfaceDefinition => "aidl",
            Language::Java => "java",
            Language::Kotlin => "kt",
            Language::Rust => "rs",
            Language::TypeScript => "ts",
            Language::Swift => "swift",
        }
    }
}

/// A Management is a vertical domain concern.
///
/// Managements are the "what"—the entities and operations that constitute
/// a domain. Each Management spans all Rings.
///
/// Example Managements:
/// - BookmarkMgmt: Managing bookmarks (create, update, delete, list)
/// - PostMgmt: Managing posts (author, publish, edit)
/// - PersonMgmt: Managing identities (profile, contacts, presence)
#[derive(Debug, Clone)]
pub struct Management {
    /// Name of this Management (e.g., "BookmarkMgmt")
    pub name: String,
    
    /// The AIDL interface that defines this Management's contract
    pub aidl: crate::parser::AidlFile,
    
    /// Metadata from the AIDL file
    pub package: String,
    
    /// Description for documentation
    pub description: String,
}

impl Management {
    /// Create a new Management from an AIDL file
    pub fn from_aidl(aidl: crate::parser::AidlFile) -> Self {
        let name = aidl.interface_name.clone();
        let package = aidl.package.clone();
        
        Self {
            name,
            aidl,
            package,
            description: String::new(),
        }
    }
    
    /// Get the interface name without the 'I' prefix for use in generated code
    pub fn service_name(&self) -> String {
        self.aidl.interface_name.trim_start_matches('I').to_string()
    }
}

/// How two adjacent Rings connect for a given Management.
///
/// The BoundaryType determines what code is generated to cross from one Ring
/// to another. It's computed from the properties of the adjacent Rings.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum BoundaryType {
    /// AIDL definition (from nothing to AIDL)
    AidlDefinition,
    
    /// Java stub generated from AIDL
    AidlToJava,
    
    /// Kotlin stub generated from AIDL
    AidlToKotlin,
    
    /// Rust trait generated from AIDL
    AidlToRust,
    
    /// TypeScript interface generated from AIDL
    AidlToTypeScript,
    
    /// JNI exports from Rust to Java
    JniDowncall,
    
    /// JNI upcalls from Java to Rust
    JniUpcall,
    
    /// FFI between Rust and another language
    Ffi { abi: String },
    
    /// Tauri command (TypeScript to Rust)
    TauriCommand,
    
    /// Direct call (same language, same process)
    Direct,
    
    /// Inter-process communication
    Ipc { protocol: String },
    
    /// Network boundary (HTTP, gRPC, etc.)
    Network { protocol: String, serialization: String },
    
    /// Custom boundary type
    Custom(String),
}

impl BoundaryType {
    /// Compute the boundary type between two Rings
    pub fn between(from: &Ring, to: &Ring) -> Option<Self> {
        // Rings must be adjacent
        if !from.is_adjacent_to(to) {
            return None;
        }
        
        // Inner ring must have lower order
        let (inner, outer) = if from.is_inner(to) {
            (from, to)
        } else {
            (to, from)
        };
        
        use ArtifactType as At;
        use Language as Lang;
        
        Some(match (inner.artifact_type.clone(), outer.artifact_type.clone()) {
            // AIDL definition (from nothing)
            (At::Aidl, At::Stub) => match outer.language {
                Lang::Java => BoundaryType::AidlToJava,
                Lang::Kotlin => BoundaryType::AidlToKotlin,
                Lang::Rust => BoundaryType::AidlToRust,
                Lang::TypeScript => BoundaryType::AidlToTypeScript,
                _ => BoundaryType::Custom(format!("AidlTo{:?}", outer.language)),
            },
            
            // JNI boundaries
            (At::Stub, At::JniGlue) if inner.language == Lang::Rust && outer.language == Lang::Java => {
                BoundaryType::JniDowncall
            }
            (At::JniGlue, At::ServiceImpl) if inner.language == Lang::Rust => {
                BoundaryType::Direct
            }
            
            // Tauri command boundary
            (At::PlatformImpl, At::TauriCommands) if outer.language == Lang::Rust => {
                BoundaryType::TauriCommand
            }
            
            // TypeScript adaptor
            (At::TauriCommands, At::TsAdaptor) => {
                BoundaryType::Direct
            }
            
            // Default: direct if same language
            _ => {
                if inner.language == outer.language {
                    BoundaryType::Direct
                } else {
                    BoundaryType::Custom(format!("{:?}To{:?}", inner.language, outer.language))
                }
            }
        })
    }
}

/// A Boundary is the generated code that connects two Rings for a Management.
///
/// Boundaries are the edges of the graph—where translation happens, where
/// meaning is conserved across different forms.
#[derive(Debug, Clone)]
pub struct Boundary {
    /// The inner Ring (closer to source)
    pub from: Ring,
    
    /// The outer Ring (closer to user)
    pub to: Ring,
    
    /// How these Rings connect
    pub boundary_type: BoundaryType,
    
    /// The Management this boundary serves
    pub management_name: String,
}

impl Boundary {
    /// Create a new Boundary
    pub fn new(from: Ring, to: Ring, management_name: impl Into<String>) -> Option<Self> {
        let boundary_type = BoundaryType::between(&from, &to)?;
        
        Some(Self {
            from,
            to,
            boundary_type,
            management_name: management_name.into(),
        })
    }
    
    /// Get a unique identifier for this boundary
    pub fn id(&self) -> String {
        format!("{}_{}_{}", 
            self.management_name,
            self.from.name.to_lowercase(),
            self.to.name.to_lowercase()
        )
    }
}

/// The Architecture defines the Rings and their connections.
///
/// Parsed from `meta.aidl`, this is the blueprint for code generation.
/// It answers: "What Rings exist? How do they connect? What Managements
/// are defined?"
#[derive(Debug, Clone)]
pub struct Architecture {
    /// All Rings in this architecture, ordered by `order`
    pub rings: Vec<Ring>,
    
    /// All Managements in this architecture
    pub managements: Vec<Management>,
    
    /// Global configuration
    pub config: Config,
    
    /// Quick lookup for Rings by name
    ring_map: HashMap<String, Ring>,
}

impl Architecture {
    /// Create a new empty Architecture
    pub fn new() -> Self {
        Self {
            rings: Vec::new(),
            managements: Vec::new(),
            config: Config::default(),
            ring_map: HashMap::new(),
        }
    }
    
    /// Add a Ring to the architecture
    pub fn add_ring(&mut self, ring: Ring) {
        self.ring_map.insert(ring.name.clone(), ring.clone());
        self.rings.push(ring);
        self.rings.sort_by_key(|r| r.order);
    }
    
    /// Get a Ring by name
    pub fn get_ring(&self, name: &str) -> Option<&Ring> {
        self.ring_map.get(name)
    }
    
    /// Add a Management
    pub fn add_management(&mut self, mgmt: Management) {
        self.managements.push(mgmt);
    }
    
    /// Get all adjacent Ring pairs (boundaries)
    pub fn ring_pairs(&self) -> Vec<(&Ring, &Ring)> {
        self.rings.windows(2)
            .map(|w| (&w[0], &w[1]))
            .collect()
    }
    
    /// Generate all Boundaries for a given Management
    pub fn boundaries_for(&self, mgmt: &Management) -> Vec<Boundary> {
        self.ring_pairs()
            .into_iter()
            .filter_map(|(from, to)| {
                Boundary::new(from.clone(), to.clone(), &mgmt.name)
            })
            .collect()
    }
    
    /// Generate all Boundaries for all Managements
    pub fn all_boundaries(&self) -> Vec<Boundary> {
        self.managements.iter()
            .flat_map(|mgmt| self.boundaries_for(mgmt))
            .collect()
    }
}

impl Default for Architecture {
    fn default() -> Self {
        Self::new()
    }
}

/// Global configuration for the architecture
#[derive(Debug, Clone)]
pub struct Config {
    /// Project name
    pub project_name: String,
    
    /// Base package/namespace
    pub base_package: String,
    
    /// Output directory for generated code
    pub output_dir: String,
    
    /// Version of the architecture
    pub version: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            project_name: "unnamed".to_string(),
            base_package: "com.example".to_string(),
            output_dir: "./gen".to_string(),
            version: "0.1.0".to_string(),
        }
    }
}

/// Predefined Ring configurations for common architectures
pub mod presets {
    use super::*;
    
    /// Standard 7-Ring architecture for Tauri + Android
    pub fn tauri_android() -> Vec<Ring> {
        vec![
            Ring::new("Contract", 0, ArtifactType::Aidl, Language::InterfaceDefinition),
            Ring::new("Binding", 1, ArtifactType::Stub, Language::Java),
            Ring::new("Bridge", 2, ArtifactType::JniGlue, Language::Rust),
            Ring::new("Core", 3, ArtifactType::ServiceImpl, Language::Rust),
            Ring::new("Platform", 4, ArtifactType::PlatformTrait, Language::Rust),
            Ring::new("Interface", 5, ArtifactType::TauriCommands, Language::Rust),
            Ring::new("Front", 6, ArtifactType::TsAdaptor, Language::TypeScript),
        ]
    }
    
    /// 6-Ring architecture for pure desktop (no Android)
    pub fn tauri_desktop() -> Vec<Ring> {
        vec![
            Ring::new("Contract", 0, ArtifactType::Aidl, Language::InterfaceDefinition),
            Ring::new("Bridge", 1, ArtifactType::Ffi, Language::Rust),
            Ring::new("Core", 2, ArtifactType::ServiceImpl, Language::Rust),
            Ring::new("Platform", 3, ArtifactType::PlatformTrait, Language::Rust),
            Ring::new("Interface", 4, ArtifactType::TauriCommands, Language::Rust),
            Ring::new("Front", 5, ArtifactType::TsAdaptor, Language::TypeScript),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_ring_adjacency() {
        let r0 = Ring::new("Contract", 0, ArtifactType::Aidl, Language::Aidl);
        let r1 = Ring::new("Binding", 1, ArtifactType::Stub, Language::Java);
        let r2 = Ring::new("Bridge", 2, ArtifactType::JniGlue, Language::Rust);
        
        assert!(r0.is_adjacent_to(&r1));
        assert!(r1.is_adjacent_to(&r0));
        assert!(r1.is_adjacent_to(&r2));
        assert!(!r0.is_adjacent_to(&r2));
    }
    
    #[test]
    fn test_architecture_builder() {
        let mut arch = Architecture::new();
        
        for ring in presets::tauri_android() {
            arch.add_ring(ring);
        }
        
        assert_eq!(arch.rings.len(), 7);
        assert_eq!(arch.rings[0].name, "Contract");
        assert_eq!(arch.rings[6].name, "Front");
        
        let pairs = arch.ring_pairs();
        assert_eq!(pairs.len(), 6);
    }
}
