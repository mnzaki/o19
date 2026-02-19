//! Meta-AIDL Parser
//!
//! Parses `meta.aidl` files that define the Architecture (Rings, Managements, config).
//!
//! This is the spiral eating its own tail: the tool that reads AIDL
//! is itself configured by AIDL.

use crate::architecture::{
    Architecture, ArtifactType, Config, Language, Management, Ring,
};
use crate::parser::AidlParser;

/// Errors that can occur when parsing meta.aidl
#[derive(Debug, thiserror::Error)]
pub enum MetaParseError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("AIDL parse error: {0}")]
    AidlParse(String),
    
    #[error("Missing required method: {0}")]
    MissingMethod(String),
    
    #[error("Invalid ring definition: {0}")]
    InvalidRing(String),
    
    #[error("Invalid artifact type: {0}")]
    InvalidArtifactType(String),
    
    #[error("Invalid language: {0}")]
    InvalidLanguage(String),
}

/// Parser for meta.aidl files
pub struct MetaParser;

impl MetaParser {
    /// Create a new MetaParser
    pub fn new() -> Self {
        Self
    }
    
    /// Parse a meta.aidl file into an Architecture
    pub fn parse(&self, content: &str) -> Result<Architecture, MetaParseError> {
        let parser = AidlParser::new();
        let aidl = parser.parse(content)
            .map_err(|e| MetaParseError::AidlParse(e))?;
        
        // The meta.aidl should define an interface (e.g., IMetaArchitecture)
        // with methods that return the architecture configuration
        let mut arch = Architecture::new();
        
        // Extract configuration from the interface methods
        // We'll look for standard method names that define the architecture
        for method in &aidl.methods {
            match method.name.as_str() {
                "getRings" => {
                    // Method returns String[] or List<String>
                    // For now, we'll use hardcoded rings based on the package name
                    // or annotations
                }
                "getConnections" => {
                    // Returns Connection[] - defines how rings connect
                }
                "getManagements" => {
                    // Returns String[] - names of managements to generate
                }
                "getConfig" => {
                    // Returns Config - global configuration
                }
                _ => {}
            }
        }
        
        // If we don't have explicit configuration, infer from package/annotations
        // For now, use a default Tauri+Android architecture
        self.infer_architecture(&aidl, &mut arch)?;
        
        Ok(arch)
    }
    
    /// Parse meta.aidl and add Managements from a directory of .aidl files
    pub fn parse_with_managements(
        &self,
        meta_content: &str,
        aidl_dir: &std::path::Path,
    ) -> Result<Architecture, MetaParseError> {
        let mut arch = self.parse(meta_content)?;
        
        // Recursively scan directory for other .aidl files (excluding meta.aidl)
        self.find_and_add_managements(&mut arch, aidl_dir)?;
        
        Ok(arch)
    }
    
    /// Recursively find AIDL files and add them as Managements
    fn find_and_add_managements(
        &self,
        arch: &mut Architecture,
        dir: &std::path::Path,
    ) -> Result<(), MetaParseError> {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    // Recurse into subdirectories
                    self.find_and_add_managements(arch, &path)?;
                } else if let Some(ext) = path.extension() {
                    if ext == "aidl" {
                        let name = path.file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("");
                        
                        // Skip meta.aidl files
                        if name.starts_with("meta") {
                            continue;
                        }
                        
                        // Parse the management AIDL
                        let content = std::fs::read_to_string(&path)?;
                        let parser = AidlParser::new();
                        if let Ok(aidl) = parser.parse(&content) {
                            let mgmt = Management::from_aidl(aidl);
                            arch.add_management(mgmt);
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Infer architecture from AIDL structure and annotations
    fn infer_architecture(
        &self,
        aidl: &crate::parser::AidlFile,
        arch: &mut Architecture,
    ) -> Result<(), MetaParseError> {
        // Check for @architecture annotation in the package or interface
        // For now, use a sensible default based on common patterns
        
        // Default: Tauri + Android architecture
        let rings = crate::architecture::presets::tauri_android();
        for ring in rings {
            arch.add_ring(ring);
        }
        
        // Extract config from the package name or interface
        arch.config.base_package = aidl.package.clone();
        arch.config.project_name = aidl.interface_name.clone();
        
        Ok(())
    }
}

impl Default for MetaParser {
    fn default() -> Self {
        Self::new()
    }
}

/// Helper to create a default meta.aidl content
pub fn default_meta_aidl() -> String {
    r#"// meta.aidl
// Architecture configuration for aidl-spiral
//
// This file defines the Rings and Managements for code generation.
// The spiral configures itself.

package aidl.config;

/** Defines the architecture for this project */
interface IMetaArchitecture {
    
    /** Available Rings in order from innermost to outermost */
    String[] getRings();
    
    /** Which Managements to generate code for */
    String[] getManagements();
    
    /** Global configuration */
    Config getConfig();
}

/** Configuration for the architecture */
parcelable Config {
    String projectName;
    String basePackage;
    String outputDir;
}
"#.to_string()
}

/// Helper to create a meta.aidl for Tauri+Android
pub fn tauri_android_meta_aidl() -> String {
    r#"// meta.aidl
// Tauri + Android architecture

package aidl.config;

interface IMetaArchitecture {
    /** Ring definitions: name, order, artifactType, language */
    Ring[] getRings();
    
    /** Managements to generate */
    String[] getManagements();
    
    /** Global config */
    Config getConfig();
}

parcelable Ring {
    String name;           // "Contract", "Binding", "Bridge", "Core", "Platform", "Interface", "Front"
    int order;             // 0, 1, 2, 3, 4, 5, 6
    String artifactType;   // "Aidl", "Stub", "JniGlue", "ServiceImpl", "PlatformTrait", "TauriCommands", "TsAdaptor"
    String language;       // "aidl", "java", "rust", "typescript"
}

parcelable Config {
    String projectName;
    String basePackage;    // e.g., "ty.circulari.o19"
    String outputDir;      // e.g., "./gen"
}
"#.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_default_meta() {
        let parser = MetaParser::new();
        let content = default_meta_aidl();
        let arch = parser.parse(&content).unwrap();
        
        // Should have the default Tauri+Android rings
        assert_eq!(arch.rings.len(), 7);
        assert_eq!(arch.rings[0].name, "Contract");
        assert_eq!(arch.rings[6].name, "Front");
    }
}
