//! AIDL file parser
//! 
//! Parses AIDL interface definitions to extract:
//! - Package name
//! - Interface name
//! - Imports
//! - Methods with their signatures

use regex::Regex;

#[derive(Debug, Clone, PartialEq)]
pub struct AidlMethod {
    pub name: String,
    pub return_type: AidlType,
    pub args: Vec<AidlArg>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AidlArg {
    pub direction: ArgDirection,
    pub name: String,
    pub ty: AidlType,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ArgDirection {
    In,
    Out,
    InOut,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AidlType {
    Void,
    Boolean,
    Byte,
    Char,
    Short,
    Int,
    Long,
    Float,
    Double,
    String,
    List(Box<AidlType>),
    Map(Box<AidlType>, Box<AidlType>),
    Parcelable(String),
    Interface(String),
    Array(Box<AidlType>),
}

#[derive(Debug, Clone)]
pub struct AidlFile {
    pub package: String,
    pub imports: Vec<String>,
    pub interface_name: String,
    pub methods: Vec<AidlMethod>,
}

pub struct AidlParser;

impl AidlParser {
    pub fn new() -> Self {
        Self
    }

    pub fn parse(&self, content: &str) -> Result<AidlFile, String> {
        // Remove comments
        let content = self.remove_comments(content);
        
        // Parse package
        let package = self.parse_package(&content)?;
        
        // Parse imports
        let imports = self.parse_imports(&content);
        
        // Parse interface
        let (interface_name, methods) = self.parse_interface(&content)?;
        
        Ok(AidlFile {
            package,
            imports,
            interface_name,
            methods,
        })
    }

    fn remove_comments(&self, content: &str) -> String {
        // Remove single-line comments (multiline mode to match $ at end of each line)
        let single_line = Regex::new(r"(?m)//.*$").unwrap();
        let content = single_line.replace_all(content, "");
        
        // Remove multi-line comments
        let multi_line = Regex::new(r"/\*[\s\S]*?\*/").unwrap();
        multi_line.replace_all(&content, "").to_string()
    }

    fn parse_package(&self, content: &str) -> Result<String, String> {
        let re = Regex::new(r"package\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*;").unwrap();
        re.captures(content)
            .and_then(|cap| cap.get(1))
            .map(|m| m.as_str().to_string())
            .ok_or_else(|| "Package declaration not found".to_string())
    }

    fn parse_imports(&self, content: &str) -> Vec<String> {
        let re = Regex::new(r"import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*;").unwrap();
        re.captures_iter(content)
            .filter_map(|cap| cap.get(1).map(|m| m.as_str().to_string()))
            .collect()
    }

    fn parse_interface(&self, content: &str) -> Result<(String, Vec<AidlMethod>), String> {
        // Match interface declaration with optional modifiers
        let re = Regex::new(
            r"(?:oneway\s+)?interface\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{([^}]*)\}"
        ).unwrap();
        
        let caps = re.captures(content)
            .ok_or_else(|| "Interface declaration not found".to_string())?;
        
        let interface_name = caps.get(1).unwrap().as_str().to_string();
        let body = caps.get(2).unwrap().as_str();
        
        let methods = self.parse_methods(body)?;
        
        Ok((interface_name, methods))
    }

    fn parse_methods(&self, body: &str) -> Result<Vec<AidlMethod>, String> {
        let mut methods = Vec::new();
        
        // Split by semicolons, handling nested generics
        for stmt in self.split_statements(body) {
            let stmt = stmt.trim();
            if stmt.is_empty() {
                continue;
            }
            
            // Check for oneway modifier
            let is_oneway = stmt.starts_with("oneway ");
            let stmt = if is_oneway { &stmt[7..] } else { stmt };
            
            // Parse method signature
            if let Some(method) = self.parse_method_signature(stmt)? {
                methods.push(method);
            }
        }
        
        Ok(methods)
    }

    fn split_statements<'a>(&self, body: &'a str) -> Vec<&'a str> {
        let mut statements = Vec::new();
        let mut start = 0;
        let mut paren_depth = 0;
        let mut generic_depth = 0;
        
        for (i, c) in body.char_indices() {
            match c {
                '(' => paren_depth += 1,
                ')' => paren_depth -= 1,
                '<' if paren_depth == 0 => generic_depth += 1,
                '>' if paren_depth == 0 => generic_depth -= 1,
                ';' if paren_depth == 0 && generic_depth == 0 => {
                    statements.push(&body[start..i]);
                    start = i + 1;
                }
                _ => {}
            }
        }
        
        // Add remaining content (should be empty or whitespace)
        if start < body.len() {
            let remaining = &body[start..].trim();
            if !remaining.is_empty() {
                statements.push(&body[start..]);
            }
        }
        
        statements
    }

    fn parse_method_signature(&self, stmt: &str) -> Result<Option<AidlMethod>, String> {
        // Method pattern: return_type name(arg1, arg2, ...)
        // Handles: void foo(), String bar(in int x), List<String> baz()
        let re = Regex::new(
            r"^\s*([a-zA-Z_][a-zA-Z0-9_<>,\s\[\]]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*$"
        ).unwrap();
        
        let caps = match re.captures(stmt) {
            Some(c) => c,
            None => return Ok(None), // Might be a constant or other declaration
        };
        
        let return_type_str = caps.get(1).unwrap().as_str().trim();
        let name = caps.get(2).unwrap().as_str().to_string();
        let args_str = caps.get(3).unwrap().as_str();
        
        let return_type = self.parse_type(return_type_str)?;
        let args = self.parse_args(args_str)?;
        
        Ok(Some(AidlMethod {
            name,
            return_type,
            args,
        }))
    }

    fn parse_args(&self, args_str: &str) -> Result<Vec<AidlArg>, String> {
        let mut args = Vec::new();
        
        if args_str.trim().is_empty() {
            return Ok(args);
        }
        
        // Split by commas, being careful about generics
        for arg in self.split_args(args_str) {
            let arg = arg.trim();
            if arg.is_empty() {
                continue;
            }
            
            args.push(self.parse_arg(arg)?);
        }
        
        Ok(args)
    }

    fn split_args<'a>(&self, args_str: &'a str) -> Vec<&'a str> {
        let mut args = Vec::new();
        let mut start = 0;
        let mut paren_depth = 0;
        let mut generic_depth = 0;
        
        for (i, c) in args_str.char_indices() {
            match c {
                '(' => paren_depth += 1,
                ')' => paren_depth -= 1,
                '<' => generic_depth += 1,
                '>' => generic_depth -= 1,
                ',' if paren_depth == 0 && generic_depth == 0 => {
                    args.push(&args_str[start..i]);
                    start = i + 1;
                }
                _ => {}
            }
        }
        
        if start < args_str.len() {
            args.push(&args_str[start..]);
        }
        
        args
    }

    fn parse_arg(&self, arg_str: &str) -> Result<AidlArg, String> {
        // Parse direction specifier
        let (direction, rest) = if arg_str.starts_with("inout ") {
            (ArgDirection::InOut, &arg_str[6..])
        } else if arg_str.starts_with("out ") {
            (ArgDirection::Out, &arg_str[4..])
        } else if arg_str.starts_with("in ") {
            (ArgDirection::In, &arg_str[3..])
        } else {
            (ArgDirection::In, arg_str) // Default to in
        };
        
        let rest = rest.trim();
        
        // Parse type and name
        // Find the last space/angle bracket that separates type from name
        let re = Regex::new(r"^([a-zA-Z_][a-zA-Z0-9_<>,\s\[\]]*?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$").unwrap();
        
        let caps = re.captures(rest)
            .ok_or_else(|| format!("Could not parse argument: {}", arg_str))?;
        
        let type_str = caps.get(1).unwrap().as_str().trim();
        let name = caps.get(2).unwrap().as_str().to_string();
        let ty = self.parse_type(type_str)?;
        
        Ok(AidlArg {
            direction,
            name,
            ty,
        })
    }

    fn parse_type(&self, type_str: &str) -> Result<AidlType, String> {
        let type_str = type_str.trim();
        
        // Check for array
        if type_str.ends_with("[]") {
            let inner = &type_str[..type_str.len()-2];
            let inner_type = self.parse_type(inner)?;
            return Ok(AidlType::Array(Box::new(inner_type)));
        }
        
        // Check for generic types
        if type_str.contains('<') {
            return self.parse_generic_type(type_str);
        }
        
        // Primitive types
        match type_str {
            "void" => Ok(AidlType::Void),
            "boolean" => Ok(AidlType::Boolean),
            "byte" => Ok(AidlType::Byte),
            "char" => Ok(AidlType::Char),
            "short" => Ok(AidlType::Short),
            "int" => Ok(AidlType::Int),
            "long" => Ok(AidlType::Long),
            "float" => Ok(AidlType::Float),
            "double" => Ok(AidlType::Double),
            "String" => Ok(AidlType::String),
            // Parcelables and interfaces
            _ => {
                if type_str.chars().next().unwrap().is_uppercase() {
                    // Assume parcelable by default, could be interface
                    Ok(AidlType::Parcelable(type_str.to_string()))
                } else {
                    Err(format!("Unknown type: {}", type_str))
                }
            }
        }
    }

    fn parse_generic_type(&self, type_str: &str) -> Result<AidlType, String> {
        // Parse List<T> or Map<K, V>
        let re = Regex::new(r"^([a-zA-Z_][a-zA-Z0-9_]*)\s*<(.+)>\s*$").unwrap();
        
        let caps = re.captures(type_str)
            .ok_or_else(|| format!("Invalid generic type: {}", type_str))?;
        
        let container = caps.get(1).unwrap().as_str();
        let inner = caps.get(2).unwrap().as_str();
        
        match container {
            "List" => {
                let inner_type = self.parse_type(inner)?;
                Ok(AidlType::List(Box::new(inner_type)))
            }
            "Map" => {
                // Parse key and value types
                let parts: Vec<&str> = self.split_args(inner);
                if parts.len() != 2 {
                    return Err(format!("Map requires 2 type parameters: {}", type_str));
                }
                let key_type = self.parse_type(parts[0])?;
                let value_type = self.parse_type(parts[1])?;
                Ok(AidlType::Map(Box::new(key_type), Box::new(value_type)))
            }
            _ => {
                // Generic parcelable
                Ok(AidlType::Parcelable(type_str.to_string()))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_interface() {
        let aidl = r#"
            package ty.circulari.o19;
            
            interface IFoundframeRadicle {
                String getNodeId();
                void start();
                int getCount();
            }
        "#;
        
        let parser = AidlParser::new();
        let result = parser.parse(aidl).unwrap();
        
        assert_eq!(result.package, "ty.circulari.o19");
        assert_eq!(result.interface_name, "IFoundframeRadicle");
        assert_eq!(result.methods.len(), 3);
        assert_eq!(result.methods[0].name, "getNodeId");
        assert_eq!(result.methods[0].return_type, AidlType::String);
        assert_eq!(result.methods[1].name, "start");
        assert_eq!(result.methods[1].return_type, AidlType::Void);
    }

    #[test]
    fn test_parse_with_args() {
        let aidl = r#"
            package test;
            
            interface ITest {
                String addPost(in String content, in String title);
                boolean check(in int value);
            }
        "#;
        
        let parser = AidlParser::new();
                let result = parser.parse(aidl).unwrap();
        
        assert_eq!(result.methods[0].args.len(), 2);
        assert_eq!(result.methods[0].args[0].name, "content");
        assert_eq!(result.methods[0].args[0].ty, AidlType::String);
        assert_eq!(result.methods[0].args[1].name, "title");
        assert_eq!(result.methods[1].args[0].ty, AidlType::Int);
    }

    #[test]
    fn test_parse_list_type() {
        let aidl = r#"
            package test;
            
            interface ITest {
                List<String> getPosts();
            }
        "#;
        
        let parser = AidlParser::new();
        let result = parser.parse(aidl).unwrap();
        
        assert!(matches!(result.methods[0].return_type, AidlType::List(_)));
    }

    #[test]
    fn test_parse_array_type() {
        let aidl = r#"
            package test;
            
            interface ITest {
                String[] getItems();
                void setItems(String[] items);
            }
        "#;
        
        let parser = AidlParser::new();
        let result = parser.parse(aidl).unwrap();
        
        assert_eq!(result.methods.len(), 2);
        assert!(matches!(result.methods[0].return_type, AidlType::Array(_)));
        assert_eq!(result.methods[1].args[0].ty, AidlType::Array(Box::new(AidlType::String)));
    }

    #[test]
    fn test_parse_full_foundframe() {
        let aidl = r#"
            package ty.circulari.o19;

            import ty.circulari.o19.IEventCallback;

            interface IFoundframeRadicle {
                String getNodeId();
                boolean isNodeRunning();
                String[] listRepositories();
                String addPost(String content, String title);
                void subscribeEvents(IEventCallback callback);
            }
        "#;
        
        let parser = AidlParser::new();
        let result = parser.parse(aidl).unwrap();
        
        assert_eq!(result.package, "ty.circulari.o19");
        assert_eq!(result.interface_name, "IFoundframeRadicle");
        assert_eq!(result.methods.len(), 5, "Expected 5 methods but got {}: {:?}", result.methods.len(), result.methods.iter().map(|m| &m.name).collect::<Vec<_>>());
        
        // Check getNodeId
        let get_node_id = result.methods.iter().find(|m| m.name == "getNodeId").expect("getNodeId not found");
        assert_eq!(get_node_id.return_type, AidlType::String);
        
        // Check isNodeRunning
        let is_running = result.methods.iter().find(|m| m.name == "isNodeRunning").expect("isNodeRunning not found");
        assert_eq!(is_running.return_type, AidlType::Boolean);
        
        // Check listRepositories
        let list_repos = result.methods.iter().find(|m| m.name == "listRepositories").expect("listRepositories not found");
        assert!(matches!(list_repos.return_type, AidlType::Array(_)));
        
        // Check addPost
        let add_post = result.methods.iter().find(|m| m.name == "addPost").expect("addPost not found");
        assert_eq!(add_post.args.len(), 2);
        
        // Check subscribeEvents
        let subscribe = result.methods.iter().find(|m| m.name == "subscribeEvents").expect("subscribeEvents not found");
        assert_eq!(subscribe.return_type, AidlType::Void);
    }
}
