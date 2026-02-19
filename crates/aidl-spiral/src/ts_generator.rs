//! TypeScript Code Generator
//!
//! Generates TypeScript adaptors from AIDL definitions.
//!
//! Maps AIDL → Tauri Commands → TypeScript Adaptors

use crate::parser::{AidlArg, AidlFile, AidlMethod, AidlType};
use std::collections::HashMap;

/// TypeScript type mapping
fn ts_type(ty: &AidlType) -> &'static str {
    match ty {
        AidlType::Void => "void",
        AidlType::Boolean => "boolean",
        AidlType::Byte => "number",
        AidlType::Char => "string",
        AidlType::Short => "number",
        AidlType::Int => "number",
        AidlType::Long => "number",
        AidlType::Float => "number",
        AidlType::Double => "number",
        AidlType::String => "string",
        AidlType::Array(inner) => match inner.as_ref() {
            AidlType::String => "string[]",
            _ => "any[]",
        },
        AidlType::List(inner) => match inner.as_ref() {
            AidlType::String => "string[]",
            _ => "any[]",
        },
        _ => "any",
    }
}

/// Convert AIDL method name to Tauri command name
fn to_tauri_command(method_name: &str) -> String {
    // camelCase to snake_case
    let mut result = String::new();
    let chars: Vec<char> = method_name.chars().collect();
    
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
    
    format!("plugin:o19-foundframe-tauri|{}", result)
}

/// Convert AIDL arg name to camelCase
fn to_camel_case(name: &str) -> String {
    // Handle deviceId → deviceId (already camelCase)
    // Handle device_id → deviceId
    let mut result = String::new();
    let mut capitalize_next = false;
    
    for c in name.chars() {
        if c == '_' || c == '-' {
            capitalize_next = true;
        } else if capitalize_next {
            result.push(c.to_uppercase().next().unwrap());
            capitalize_next = false;
        } else {
            result.push(c);
        }
    }
    
    result
}

/// Generate TypeScript adaptor index file
pub fn generate_ts_index(aidl: &AidlFile) -> String {
    let entity_adaptors = vec![
        ("Post", vec!["addPost"]),
        ("Bookmark", vec!["addBookmark"]),
        ("Media", vec!["addMediaLink"]),
        ("Person", vec!["addPerson"]),
        ("Conversation", vec!["addConversation"]),
        ("Stream", vec!["addTextNote"]),
        ("Device", vec!["generatePairingCode", "confirmPairing", "followDevice", "listFollowers", "unpairDevice"]),
    ];
    
    let imports: Vec<String> = entity_adaptors
        .iter()
        .map(|(name, _)| format!(
            "import {{ Tauri{}Adaptor }} from './generated/{}.adaptor.js';",
            name, name.to_lowercase()
        ))
        .collect();
    
    let adaptor_list: Vec<String> = entity_adaptors
        .iter()
        .map(|(name, _)| format!(
            "  {}: new Tauri{}Adaptor(db),",
            name.to_lowercase(),
            name
        ))
        .collect();
    
    format!(
        r#"/**
 * Auto-generated Tauri adaptors from {interface_name}.aidl
 * 
 * This module exports generated adaptors that bridge TypeScript domain
 * to Tauri commands that delegate to the AIDL service.
 */

import type {{ BaseSQLiteDatabase }} from 'drizzle-orm/sqlite-core';
import type {{ DatabasePorts }} from '@o19/foundframe-front';
import {{ DrizzleViewAdaptor }} from '@o19/foundframe-drizzle/adaptors';

{imports}

/**
 * Result from stream entry creation commands
 */
export interface StreamEntryResult {{
  id?: number;
  seenAt: number;
  reference: string;
}}

/**
 * Create all Tauri adaptors
 */
export function createTauriAdaptors(db: BaseSQLiteDatabase<any, any>): DatabasePorts {{
  const stream = new TauriStreamAdaptor(db);
  const view = new DrizzleViewAdaptor(db, stream);

  return {{
{adaptors}
    view,
  }};
}}

export * from './generated/';
"#,
        interface_name = aidl.interface_name,
        imports = imports.join("\n"),
        adaptors = adaptor_list.join("\n"),
    )
}

/// Generate a TypeScript adaptor for an entity
pub fn generate_ts_adaptor(aidl: &AidlFile, entity_name: &str, methods: &[&str]) -> String {
    // Find methods that match
    let matched_methods: Vec<&AidlMethod> = aidl
        .methods
        .iter()
        .filter(|m| methods.contains(&m.name.as_str()))
        .collect();
    
    if matched_methods.is_empty() {
        return format!("// No methods found for {}\n", entity_name);
    }
    
    let adaptor_class = format!("Tauri{}Adaptor", entity_name);
    let parent_class = format!("Drizzle{}Adaptor", entity_name);
    
    // Generate method implementations
    let method_impls: Vec<String> = matched_methods
        .iter()
        .map(|m| generate_ts_method_impl(m, entity_name))
        .collect();
    
    format!(
        r#"/**
 * Auto-generated {entity_name} Adaptor from {interface_name}.aidl
 */

import {{ invoke }} from '@tauri-apps/api/core';
import {{ {parent_class} }} from '@o19/foundframe-drizzle/adaptors';
import type {{ BaseSQLiteDatabase }} from 'drizzle-orm/sqlite-core';
import type {{ {entity_name}, Create{entity_name} }} from '@o19/foundframe-front/domain';
import type {{ StreamEntryResult }} from '../index.js';

export class {adaptor_class} extends {parent_class} {{
  constructor(db: BaseSQLiteDatabase<any, any>) {{
    super(db);
  }}

{methods}
}}
"#,
        entity_name = entity_name,
        interface_name = aidl.interface_name,
        parent_class = parent_class,
        adaptor_class = adaptor_class,
        methods = method_impls.join("\n"),
    )
}

fn generate_ts_method_impl(method: &AidlMethod, entity_name: &str) -> String {
    let method_name = &method.name;
    let tauri_cmd = to_tauri_command(method_name);
    let camel_name = to_camel_case(method_name);
    
    // Build parameter list
    let params: Vec<String> = method
        .args
        .iter()
        .map(|arg| {
            let name = to_camel_case(&arg.name);
            let ts_ty = ts_type(&arg.ty);
            // String args are optional (nullable in AIDL)
            let optional_marker = if ts_ty == "string" { "?" } else { "" };
            format!("{}{}: {}{}", name, optional_marker, ts_ty, "")
        })
        .collect();
    
    // Build invoke arguments
    let invoke_args: Vec<String> = method
        .args
        .iter()
        .map(|arg| {
            let name = to_camel_case(&arg.name);
            format!("{}", name)
        })
        .collect();
    
    // Return type handling
    let return_ty = match (&method.return_type, method_name.as_str()) {
        (AidlType::String, name) if name.starts_with("add") => entity_name.to_string(),
        (AidlType::String, "generatePairingCode") => "string".to_string(),
        (AidlType::String, _) => "string".to_string(),
        (AidlType::Boolean, _) => "boolean".to_string(),
        (AidlType::Void, _) => "void".to_string(),
        (AidlType::Array(_), "listFollowers") => "string[]".to_string(),
        (AidlType::Array(_), "listRepositories") => "string[]".to_string(),
        _ => "any".to_string(),
    };
    
    // Build return statement based on return type
    let return_stmt = match (&method.return_type, method_name.as_str()) {
        (AidlType::Void, _) => {
            format!("await invoke<void>('{tauri_cmd}', {{ {args} }});", 
                tauri_cmd = tauri_cmd,
                args = invoke_args.join(", "))
        }
        (AidlType::String, name) if name.starts_with("add") => {
            format!(
                "const result = await invoke<StreamEntryResult>('{tauri_cmd}', {{ {args} }});\n    return this.reconstruct{entity}(result, data)",
                tauri_cmd = tauri_cmd,
                args = invoke_args.join(", "),
                entity = entity_name
            )
        }
        (AidlType::String, _) => {
            format!(
                "const result = await invoke<string>('{tauri_cmd}', {{ {args} }});\n    return result",
                tauri_cmd = tauri_cmd,
                args = invoke_args.join(", ")
            )
        }
        (AidlType::Boolean, _) => {
            format!(
                "const result = await invoke<boolean>('{tauri_cmd}', {{ {args} }});\n    return result",
                tauri_cmd = tauri_cmd,
                args = invoke_args.join(", ")
            )
        }
        (AidlType::Array(_), "listFollowers" | "listRepositories") => {
            format!(
                "const result = await invoke<string[]>('{tauri_cmd}', {{ {args} }});\n    return result",
                tauri_cmd = tauri_cmd,
                args = invoke_args.join(", ")
            )
        }
        _ => {
            format!(
                "const result = await invoke<any>('{tauri_cmd}', {{ {args} }});\n    return result",
                tauri_cmd = tauri_cmd,
                args = invoke_args.join(", ")
            )
        }
    };
    
    // Handle special cases
    if method_name == "addPost" {
        return format!(
            r#"  async create(data: Create{entity_name}): Promise<{entity_name}> {{
    // Extract text content from bits
    const content = data.bits
      .filter(bit => bit.type === 'text')
      .map(bit => bit.content)
      .join('');
    
    const headingBit = data.bits.find(bit => bit.type === 'heading');
    const title = headingBit?.content;

    {return_stmt};
  }}"#,
            entity_name = entity_name,
            return_stmt = return_stmt
        );
    }
    
    if method_name == "addMediaLink" {
        return format!(
            r#"  async create(data: Create{entity_name}): Promise<{entity_name}> {{
    // Delegate to addMediaLink method
    return this.addMediaLink({{
      directory: 'media',
      url: data.uri,
      mimeType: data.mimeType
    }});
  }}

  async addMediaLink(params: {{ 
    directory: string; 
    url: string; 
    title?: string; 
    mimeType?: string;
    subpath?: string;
  }}): Promise<{entity_name}> {{
    {return_stmt};
  }}"#,
            entity_name = entity_name,
            return_stmt = return_stmt
        );
    }
    
    // Default: generate a method that takes individual params
    // plus a create() method that takes CreateXxx data
    let default_impl = format!(
        r#"  async {camel_name}({params}): Promise<{return_ty}> {{
    {return_stmt};
  }}"#,
        camel_name = camel_name,
        params = params.join(", "),
        return_ty = return_ty,
        return_stmt = return_stmt
    );
    
    // Also generate create() method that takes the CreateXxx type
    let create_impl = format!(
        r#"  async create(data: Create{entity}): Promise<{entity}> {{
    const result = await invoke<StreamEntryResult>('{tauri_cmd}', {{
      {data_mapping}
    }});
    return {{
      id: result.id ?? 0,
      // TODO: Map other fields from data
      createdAt: new Date(result.seenAt)
    }} as {entity};
  }}"#,
        entity = entity_name,
        tauri_cmd = tauri_cmd,
        data_mapping = method.args.iter().map(|arg| {
            let name = to_camel_case(&arg.name);
            format!("{0}: data.{0}", name)
        }).collect::<Vec<_>>().join(",\n      ")
    );
    
    format!("{create_impl}\n\n  {default_impl}")
}

/// Generate all TypeScript files
pub fn generate_all_ts(aidl: &AidlFile) -> HashMap<String, String> {
    let mut files = HashMap::new();
    
    // Entity mappings
    let entities = vec![
        ("Post", vec!["addPost"]),
        ("Bookmark", vec!["addBookmark"]),
        ("Media", vec!["addMediaLink"]),
        ("Person", vec!["addPerson"]),
        ("Conversation", vec!["addConversation"]),
        ("Stream", vec!["addTextNote"]),
        ("Device", vec!["generatePairingCode", "confirmPairing", "followDevice", "listFollowers", "unpairDevice"]),
    ];
    
    // Generate index.ts
    files.insert("index.ts".to_string(), generate_ts_index(aidl));
    
    // Generate individual adaptors
    for (entity, methods) in entities {
        let content = generate_ts_adaptor(aidl, entity, &methods);
        let filename = format!("generated/{}.adaptor.ts", entity.to_lowercase());
        files.insert(filename, content);
    }
    
    files
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_to_tauri_command() {
        assert_eq!(
            to_tauri_command("addPost"),
            "plugin:o19-foundframe-tauri|add_post"
        );
        assert_eq!(
            to_tauri_command("generatePairingCode"),
            "plugin:o19-foundframe-tauri|generate_pairing_code"
        );
    }
    
    #[test]
    fn test_to_camel_case() {
        assert_eq!(to_camel_case("deviceId"), "deviceId");
        assert_eq!(to_camel_case("device_id"), "deviceId");
        assert_eq!(to_camel_case("node_id_hex"), "nodeIdHex");
    }
    
    #[test]
    fn test_ts_type() {
        assert_eq!(ts_type(&AidlType::String), "string");
        assert_eq!(ts_type(&AidlType::Boolean), "boolean");
        assert_eq!(ts_type(&AidlType::Int), "number");
        assert_eq!(ts_type(&AidlType::Array(Box::new(AidlType::String))), "string[]");
    }
}
