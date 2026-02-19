//! Workspace Integration
//!
//! Detects which Rings each package needs based on heuristics or explicit config.


use std::path::{Path, PathBuf};

/// A package in the workspace that needs AIDL code generation
#[derive(Debug, Clone)]
pub struct Package {
    /// Package name
    pub name: String,
    
    /// Absolute path to package directory
    pub path: PathBuf,
    
    /// Package type (detected or explicit)
    pub package_type: PackageType,
    
    /// Which Rings this package needs
    pub rings: Vec<String>,
    
    /// Which managements to include (None = all)
    pub managements: Option<Vec<String>>,
    
    /// Output directory for generated code
    pub output_dir: PathBuf,
    
    /// Path to AIDL source directory
    pub aidl_dir: PathBuf,
}

/// Type of package (determines default Rings)
#[derive(Debug, Clone, PartialEq)]
pub enum PackageType {
    /// Tauri Rust application (has src-tauri/)
    TauriApp,
    
    /// Rust library crate
    RustLib,
    
    /// Android-specific crate
    AndroidLib,
    
    /// TypeScript/JavaScript package
    NodePackage,
    
    /// TypeScript package with Tauri
    TauriNodePackage,
    
    /// Unknown/custom (requires explicit config)
    Unknown,
}

impl PackageType {
    /// Default Rings for this package type
    pub fn default_rings(&self) -> Vec<&'static str> {
        match self {
            // Tauri app needs Platform, Interface, Front
            PackageType::TauriApp => vec!["Platform", "Interface", "Front"],
            
            // Rust lib typically implements Core
            PackageType::RustLib => vec!["Core"],
            
            // Android needs Binding, Bridge, Core
            PackageType::AndroidLib => vec!["Binding", "Bridge", "Core"],
            
            // Pure TS package needs Front
            PackageType::NodePackage => vec!["Front"],
            
            // TS package with Tauri might need adaptors
            PackageType::TauriNodePackage => vec!["Front"],
            
            // Unknown needs explicit config
            PackageType::Unknown => vec![],
        }
    }
}

/// Discovers packages in a workspace and their AIDL configurations
pub struct WorkspaceDiscovery {
    /// Root of the workspace
    root: PathBuf,
    
    /// Discovered packages
    packages: Vec<Package>,
}

impl WorkspaceDiscovery {
    /// Create a new WorkspaceDiscovery for the given root
    pub fn new(root: impl AsRef<Path>) -> Self {
        Self {
            root: root.as_ref().to_path_buf(),
            packages: Vec::new(),
        }
    }
    
    /// Discover all packages in the workspace
    pub fn discover(&mut self) -> Result<&Vec<Package>, WorkspaceError> {
        self.packages.clear();
        
        // Check if this is a Cargo workspace
        if self.root.join("Cargo.toml").exists() {
            self.discover_cargo_workspace()?;
        }
        
        // Check if this is a pnpm workspace
        if self.root.join("pnpm-workspace.yaml").exists() {
            self.discover_pnpm_workspace()?;
        }
        
        // Also scan for any package with explicit AIDL config
        self.discover_explicit_configs()?;
        
        Ok(&self.packages)
    }
    
    /// Discover packages in a Cargo workspace
    fn discover_cargo_workspace(&mut self) -> Result<(), WorkspaceError> {
        // Read Cargo.toml to find workspace members
        let cargo_toml = self.root.join("Cargo.toml");
        let content = std::fs::read_to_string(&cargo_toml)?;
        
        // Parse workspace.members
        // This is a simplified parser - in production use toml crate
        if let Some(members_section) = content.split("[workspace]")
            .nth(1)
            .and_then(|s| s.split("[package]").next())
        {
            // Look for members = [...]
            if let Some(members) = members_section.split("members")
                .nth(1)
                .and_then(|s| s.split(']').next())
            {
                for member in members.split(',') {
                    let member = member.trim().trim_matches('"').trim_matches('\'');
                    if member.is_empty() {
                        continue;
                    }
                    
                    let member_path = self.root.join(member);
                    if let Some(pkg) = self.analyze_cargo_package(&member_path)? {
                        self.packages.push(pkg);
                    }
                }
            }
        }
        
        // Also scan o19/crates/ explicitly
        let crates_dir = self.root.join("o19/crates");
        if crates_dir.exists() {
            for entry in std::fs::read_dir(&crates_dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() && path.join("Cargo.toml").exists() {
                    if let Some(pkg) = self.analyze_cargo_package(&path)? {
                        // Check if already added
                        if !self.packages.iter().any(|p| p.path == path) {
                            self.packages.push(pkg);
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Analyze a Cargo package and determine its AIDL needs
    fn analyze_cargo_package(&self, path: &Path) -> Result<Option<Package>, WorkspaceError> {
        let cargo_toml = path.join("Cargo.toml");
        if !cargo_toml.exists() {
            return Ok(None);
        }
        
        let content = std::fs::read_to_string(&cargo_toml)?;
        
        // Extract package name
        let name = content.lines()
            .find(|l| l.starts_with("name"))
            .and_then(|l| l.split('=').nth(1))
            .map(|s| s.trim().trim_matches('"').to_string())
            .unwrap_or_else(|| path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string());
        
        // Check for explicit AIDL config
        let explicit_rings = Self::extract_aidl_rings(&content);
        
        // Detect package type
        let package_type = if explicit_rings.is_some() {
            PackageType::Unknown // Will use explicit rings
        } else {
            Self::detect_cargo_package_type(path, &content)
        };
        
        // Try naming heuristic: "{library}-{ring}" or "{library}_{ring}"
        let naming_rings = Self::detect_rings_from_name(&name);
        
        // Determine output directory
        let output_dir = Self::extract_output_dir(&content)
            .unwrap_or_else(|| path.join("spiral"));
        
        // Determine AIDL source
        let aidl_dir = Self::extract_aidl_dir(&content)
            .unwrap_or_else(|| self.root.join("aidl"));
        
        let rings = explicit_rings
            .or(naming_rings)
            .unwrap_or_else(|| package_type.default_rings()
                .into_iter()
                .map(|s| s.to_string())
                .collect());
        
        // Skip packages with no Rings
        if rings.is_empty() {
            return Ok(None);
        }
        
        Ok(Some(Package {
            name,
            path: path.to_path_buf(),
            package_type,
            rings,
            managements: None, // Default: all
            output_dir,
            aidl_dir,
        }))
    }
    
    /// Detect rings from package name suffix
    /// Pattern: "{library}-{ring}" or "{library}_{ring}"
    /// Examples: foundframe-front, foundframe_platform, o19-android
    fn detect_rings_from_name(name: &str) -> Option<Vec<String>> {
        // Split on '-' or '_'
        let parts: Vec<&str> = name.split(|c| c == '-' || c == '_').collect();
        
        if parts.len() < 2 {
            return None;
        }
        
        // Get the last part as potential ring name
        let suffix = parts.last()?.to_lowercase();
        
        match suffix.as_str() {
            "contract" | "aidl" => Some(vec!["Contract".to_string()]),
            "binding" | "stub" => Some(vec!["Binding".to_string()]),
            "bridge" | "jni" | "glue" => Some(vec!["Bridge".to_string()]),
            "core" | "domain" => Some(vec!["Core".to_string()]),
            "platform" => Some(vec!["Platform".to_string()]),
            "interface" | "commands" | "cmds" => Some(vec!["Interface".to_string()]),
            "front" | "frontend" | "ui" | "web" => Some(vec!["Front".to_string()]),
            "android" => Some(vec!["Binding".to_string(), "Bridge".to_string(), "Core".to_string()]),
            "tauri" => Some(vec!["Platform".to_string(), "Interface".to_string(), "Front".to_string()]),
            _ => None,
        }
    }
    
    /// Detect the type of a Cargo package
    fn detect_cargo_package_type(path: &Path, _content: &str) -> PackageType {
        // Check for src-tauri/ directory
        if path.join("src-tauri").exists() {
            return PackageType::TauriApp;
        }
        
        // Check for android/ directory
        if path.join("android").exists() || path.join("java").exists() {
            return PackageType::AndroidLib;
        }
        
        // Check if it's a library
        if path.join("src/lib.rs").exists() {
            return PackageType::RustLib;
        }
        
        PackageType::Unknown
    }
    
    /// Extract explicit AIDL rings from Cargo.toml
    fn extract_aidl_rings(content: &str) -> Option<Vec<String>> {
        // Look for [package.metadata.aidl-spiral] section
        let mut in_aidl_section = false;
        let mut rings = Vec::new();
        
        for line in content.lines() {
            if line.starts_with("[package.metadata.aidl-spiral]") {
                in_aidl_section = true;
                continue;
            }
            
            if in_aidl_section {
                // End of section
                if line.starts_with('[') {
                    break;
                }
                
                // Parse rings = [...]
                if line.trim().starts_with("rings") {
                    if let Some(arr) = line.split('=').nth(1) {
                        for ring in arr.split(',') {
                            let ring = ring.trim()
                                .trim_matches('[')
                                .trim_matches(']')
                                .trim_matches('"')
                                .trim_matches('\'');
                            if !ring.is_empty() {
                                rings.push(ring.to_string());
                            }
                        }
                    }
                }
            }
        }
        
        if rings.is_empty() {
            None
        } else {
            Some(rings)
        }
    }
    
    /// Extract output directory from Cargo.toml
    fn extract_output_dir(content: &str) -> Option<PathBuf> {
        // Look for output = "..." in [package.metadata.aidl]
        content.lines()
            .skip_while(|l| !l.starts_with("[package.metadata.aidl]"))
            .skip(1)
            .take_while(|l| !l.starts_with('['))
            .find(|l| l.trim().starts_with("output"))
            .and_then(|l| l.split('=').nth(1))
            .map(|s| PathBuf::from(s.trim().trim_matches('"').trim_matches('\'')))
    }
    
    /// Extract AIDL directory from Cargo.toml
    fn extract_aidl_dir(content: &str) -> Option<PathBuf> {
        content.lines()
            .skip_while(|l| !l.starts_with("[package.metadata.aidl-spiral]"))
            .skip(1)
            .take_while(|l| !l.starts_with('['))
            .find(|l| l.trim().starts_with("aidl-dir") || l.trim().starts_with("aidl_dir"))
            .and_then(|l| l.split('=').nth(1))
            .map(|s| PathBuf::from(s.trim().trim_matches('"').trim_matches('\'')))
    }
    
    /// Discover packages in a pnpm workspace
    fn discover_pnpm_workspace(&mut self) -> Result<(), WorkspaceError> {
        let pnpm_yaml = self.root.join("pnpm-workspace.yaml");
        if !pnpm_yaml.exists() {
            return Ok(());
        }
        
        let content = std::fs::read_to_string(&pnpm_yaml)?;
        
        // Parse packages: [...]
        for line in content.lines() {
            let line = line.trim();
            if line.starts_with("- '") || line.starts_with("-\"") {
                let pattern = line.trim_start_matches("- '").trim_start_matches("-\"")
                    .trim_end_matches('\'').trim_end_matches('"');
                
                // Expand glob patterns (simplified)
                if pattern.ends_with("/*") {
                    let dir = self.root.join(&pattern[..pattern.len()-2]);
                    if let Ok(entries) = std::fs::read_dir(&dir) {
                        for entry in entries.flatten() {
                            let path = entry.path();
                            if path.is_dir() && path.join("package.json").exists() {
                                if let Some(pkg) = self.analyze_node_package(&path)? {
                                    self.packages.push(pkg);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Analyze a Node.js package
    fn analyze_node_package(&self, path: &Path) -> Result<Option<Package>, WorkspaceError> {
        let package_json = path.join("package.json");
        if !package_json.exists() {
            return Ok(None);
        }
        
        let content = std::fs::read_to_string(&package_json)?;
        
        // Extract name
        let name = content.lines()
            .find(|l| l.contains("\"name\""))
            .and_then(|l| l.split(':').nth(1))
            .map(|s| s.trim().trim_matches(',').trim_matches('"').to_string())
            .unwrap_or_else(|| path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string());
        
        // Check for explicit AIDL config
        let explicit_rings = Self::extract_node_aidl_rings(&content);
        
        // Detect package type
        let package_type = if explicit_rings.is_some() {
            PackageType::Unknown
        } else {
            Self::detect_node_package_type(&content)
        };
        
        let output_dir = Self::extract_node_output_dir(&content)
            .unwrap_or_else(|| path.join("src/generated"));
        
        let aidl_dir = Self::extract_node_aidl_dir(&content)
            .unwrap_or_else(|| self.root.join("aidl"));
        
        let rings = explicit_rings
            .unwrap_or_else(|| package_type.default_rings()
                .into_iter()
                .map(|s| s.to_string())
                .collect());
        
        if rings.is_empty() {
            return Ok(None);
        }
        
        Ok(Some(Package {
            name,
            path: path.to_path_buf(),
            package_type,
            rings,
            managements: None,
            output_dir,
            aidl_dir,
        }))
    }
    
    /// Detect Node package type from package.json
    fn detect_node_package_type(content: &str) -> PackageType {
        // Check for Tauri dependency
        if content.contains("@tauri-apps") || content.contains("\"tauri\"") {
            return PackageType::TauriNodePackage;
        }
        
        PackageType::NodePackage
    }
    
    /// Extract AIDL rings from package.json
    fn extract_node_aidl_rings(content: &str) -> Option<Vec<String>> {
        // Look for "o19.aidl-spiral.rings": [...] or "o19": { "aidl-spiral": { "rings": [...] } }
        if let Some(o19_section) = content.split("\"o19\"").nth(1) {
            if let Some(aidl_section) = o19_section.split("\"aidl-spiral\"").nth(1) {
                if let Some(rings_section) = aidl_section.split("\"rings\"").nth(1) {
                    let mut rings = Vec::new();
                    if let Some(arr) = rings_section.split(':').nth(1) {
                        for ring in arr.split(',') {
                            let ring = ring.trim()
                                .trim_matches('[')
                                .trim_matches(']')
                                .trim_matches('"')
                                .trim_matches('\'');
                            if !ring.is_empty() {
                                rings.push(ring.to_string());
                            }
                        }
                    }
                    if !rings.is_empty() {
                        return Some(rings);
                    }
                }
            }
        }
        None
    }
    
    /// Extract output dir from package.json
    fn extract_node_output_dir(content: &str) -> Option<PathBuf> {
        content.split("\"o19\"")
            .nth(1)?
            .split("\"aidl\"")
            .nth(1)?
            .split("\"output\"")
            .nth(1)?
            .split(':')
            .nth(1)?
            .split(',')
            .next()
            .map(|s| PathBuf::from(s.trim().trim_matches('"')))
    }
    
    /// Extract AIDL dir from package.json
    fn extract_node_aidl_dir(content: &str) -> Option<PathBuf> {
        // Try aidlDir first, then aidl-dir
        let result = content.split("\"o19\"")
            .nth(1)?
            .split("\"aidl\"")
            .nth(1)?
            .split("\"aidlDir\"")
            .nth(1);
        
        let result = result.or_else(|| {
            content.split("\"o19\"")
                .nth(1)?
                .split("\"aidl\"")
                .nth(1)?
                .split("\"aidl-dir\"")
                .nth(1)
        });
        
        result?
            .split(':')
            .nth(1)?
            .split(',')
            .next()
            .map(|s| PathBuf::from(s.trim().trim_matches('"')))
    }
    
    /// Discover packages with explicit .aidlconfig files
    fn discover_explicit_configs(&mut self) -> Result<(), WorkspaceError> {
        // TODO: Implement .aidlconfig discovery
        Ok(())
    }
    
    /// Get all discovered packages
    pub fn packages(&self) -> &[Package] {
        &self.packages
    }
}

/// Errors during workspace discovery
#[derive(Debug, thiserror::Error)]
pub enum WorkspaceError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Parse error: {0}")]
    Parse(String),
    
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_package_type_default_rings() {
        assert_eq!(
            PackageType::TauriApp.default_rings(),
            vec!["Platform", "Interface", "Front"]
        );
        
        assert_eq!(
            PackageType::RustLib.default_rings(),
            vec!["Core"]
        );
        
        assert_eq!(
            PackageType::AndroidLib.default_rings(),
            vec!["Binding", "Bridge", "Core"]
        );
        
        assert!(PackageType::Unknown.default_rings().is_empty());
    }
    
    #[test]
    fn test_extract_cargo_aidl_rings() {
        let toml = r#"
[package]
name = "test"

[package.metadata.aidl-spiral]
rings = ["Core", "Platform"]
output = "src/gen"
"#;
        
        let rings = WorkspaceDiscovery::extract_aidl_rings(toml);
        assert_eq!(rings, Some(vec!["Core".to_string(), "Platform".to_string()]));
    }
}
