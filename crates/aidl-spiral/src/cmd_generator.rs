//! Tauri Command Generator
//!
//! Generates Tauri command handlers from AIDL method definitions.
//!
//! Each AIDL method becomes a `#[tauri::command]` that delegates to the Platform trait.

use crate::parser::{AidlFile, AidlMethod, AidlType};
use proc_macro2::TokenStream;
use quote::{format_ident, quote};

/// Configuration for command generation
pub struct CmdConfig {
    /// Module name for the commands (default: "commands")
    pub module_name: String,
    /// Whether to generate async commands (default: true)
    pub async_commands: bool,
    /// Plugin name for command prefix (default: "o19-foundframe-tauri")
    pub plugin_name: String,
}

impl Default for CmdConfig {
    fn default() -> Self {
        Self {
            module_name: "commands".to_string(),
            async_commands: true,
            plugin_name: "o19-foundframe-tauri".to_string(),
        }
    }
}

/// Generate complete commands module
pub fn generate_commands_module(aidl: &AidlFile, config: &CmdConfig) -> TokenStream {
    let module_name = format_ident!("{}", config.module_name);
    
    // Generate command functions for each AIDL method
    let command_fns: Vec<TokenStream> = aidl
        .methods
        .iter()
        .filter(|m| should_generate_command(m))  // Skip getters, internal methods
        .map(|m| generate_command_fn(m, config))
        .collect();
    
    // Generate command registration list
    let command_names: Vec<TokenStream> = aidl
        .methods
        .iter()
        .filter(|m| should_generate_command(m))
        .map(|m| {
            let name = format_ident!("{}", to_snake_case(&m.name));
            quote! { #name }
        })
        .collect();
    
    // Generate plugin command names for TypeScript
    let plugin_commands = generate_plugin_command_names(aidl, config);
    
    quote! {
        //! Auto-generated Tauri commands from #aidl.interface_name
        //!
        //! DO NOT EDIT MANUALLY - Generated from AIDL
        
        use tauri::{AppHandle, Manager, Runtime};
        use crate::{Result, models::*};
        
        #(#command_fns)*
        
        /// Register all generated commands with Tauri
        pub fn register_commands<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
            builder.invoke_handler(tauri::generate_handler![
                #(#command_names),*
            ])
        }
        
        /// Command names for TypeScript integration
        pub mod plugin_commands {
            #(#plugin_commands)*
        }
    }
}

/// Generate a single command function
fn generate_command_fn(method: &AidlMethod, config: &CmdConfig) -> TokenStream {
    let cmd_name = format_ident!("{}", to_snake_case(&method.name));
    let is_async = config.async_commands;
    
    // Generate parameter list
    let params: Vec<TokenStream> = method
        .args
        .iter()
        .map(|arg| {
            let name = format_ident!("{}", to_snake_case(&arg.name));
            let ty = rust_param_type(&arg.ty);
            quote! { #name: #ty }
        })
        .collect();
    
    // Generate platform call arguments
    let call_args: Vec<TokenStream> = method
        .args
        .iter()
        .map(|arg| {
            let name = format_ident!("{}", to_snake_case(&arg.name));
            quote! { #name }
        })
        .collect();
    
    // Return type
    let return_ty = rust_return_type(&method.return_type);
    
    // Platform method name
    let platform_method = format_ident!("{}", to_snake_case(&method.name));
    
    // Generate function body
    let body = if is_async {
        quote! {
            app.platform().#platform_method(#(#call_args),*).await
        }
    } else {
        quote! {
            app.platform().#platform_method(#(#call_args),*)
        }
    };
    
    // Async qualifier
    let async_kw = if is_async { quote!(async) } else { quote!() };
    let await_kw = if is_async { quote!(.await) } else { quote!() };
    
    quote! {
        /// # Command: #cmd_name
        /// 
        /// Auto-generated from AIDL method: #method_name
        /// 
        /// Delegates to Platform::#platform_method
        #[tauri::command]
        pub(crate) #async_kw fn #cmd_name<R: Runtime>(
            app: AppHandle<R>,
            #(#params),*
        ) -> Result<#return_ty> {
            #body
        }
    }
}

/// Generate plugin command name constants for TypeScript
fn generate_plugin_command_names(aidl: &AidlFile, config: &CmdConfig) -> Vec<TokenStream> {
    aidl.methods
        .iter()
        .filter(|m| should_generate_command(m))
        .map(|m| {
            let cmd_name = to_snake_case(&m.name);
            let const_name = format_ident!("{}", to_screaming_snake_case(&m.name));
            let full_cmd = format!("plugin:{}|{}", config.plugin_name, cmd_name);
            
            quote! {
                pub const #const_name: &str = #full_cmd;
            }
        })
        .collect()
}

/// Determine if an AIDL method should generate a Tauri command
fn should_generate_command(method: &AidlMethod) -> bool {
    // Skip simple getters - these might be internal
    if method.name.starts_with("get") && method.args.is_empty() {
        return false;
    }
    
    // Skip subscription methods - handled separately
    if method.name.contains("subscribe") || method.name.contains("unsubscribe") {
        return false;
    }
    
    // Skip callbacks
    if method.name.contains("Callback") {
        return false;
    }
    
    true
}

/// Convert AIDL type to Rust parameter type
fn rust_param_type(ty: &AidlType) -> TokenStream {
    match ty {
        AidlType::String => quote! { String },
        AidlType::Boolean => quote! { bool },
        AidlType::Int => quote! { i32 },
        AidlType::Long => quote! { i64 },
        AidlType::Void => quote! { () },
        _ => quote! { String }, // Default to String for unknown types
    }
}

/// Convert AIDL return type to Rust return type
fn rust_return_type(ty: &AidlType) -> TokenStream {
    match ty {
        AidlType::String => quote! { StreamEntryResult },
        AidlType::Boolean => quote! { bool },
        AidlType::Int => quote! { i32 },
        AidlType::Long => quote! { i64 },
        AidlType::Void => quote! { () },
        _ => quote! { StreamEntryResult },
    }
}

/// Convert camelCase to snake_case
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

/// Convert camelCase to SCREAMING_SNAKE_CASE
fn to_screaming_snake_case(s: &str) -> String {
    to_snake_case(s).to_uppercase()
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_to_snake_case() {
        assert_eq!(to_snake_case("addPost"), "add_post");
        assert_eq!(to_snake_case("generatePairingCode"), "generate_pairing_code");
        assert_eq!(to_snake_case("getNodeId"), "get_node_id");
    }
    
    #[test]
    fn test_should_generate_command() {
        use crate::parser::{AidlMethod, AidlType};
        
        // Should generate
        let add_post = AidlMethod {
            name: "addPost".to_string(),
            return_type: AidlType::String,
            args: vec![],
        };
        assert!(should_generate_command(&add_post));
        
        // Should skip getters
        let get_node = AidlMethod {
            name: "getNodeId".to_string(),
            return_type: AidlType::String,
            args: vec![],
        };
        assert!(!should_generate_command(&get_node));
    }
}
