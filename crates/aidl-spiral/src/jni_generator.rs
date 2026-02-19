//! JNI Code Generator
//!
//! Generates:
//! 1. Rust JNI glue code (C ABI functions)
//! 2. Rust trait definitions
//! 3. Java Stub implementation with native methods

use crate::parser::{AidlArg, AidlFile, AidlMethod, AidlType};
use proc_macro2::{Ident, TokenStream};
use quote::{format_ident, quote};


/// Configuration for code generation
#[derive(Debug, Clone)]
pub struct JniConfig {
    /// Java package name (e.g., "ty.circulari.o19")
    pub java_package: String,
    /// Rust crate name for the generated code
    pub rust_crate_name: String,
    /// Service instance singleton type path
    pub service_singleton_path: String,
}

impl Default for JniConfig {
    fn default() -> Self {
        Self {
            java_package: "ty.circulari.o19".to_string(),
            rust_crate_name: "foundframe_service".to_string(),
            service_singleton_path: "crate::SERVICE_INSTANCE".to_string(),
        }
    }
}

/// Generates all code artifacts from an AIDL file
pub struct JniGenerator {
    config: JniConfig,
}

impl JniGenerator {
    pub fn new(config: JniConfig) -> Self {
        Self { config }
    }

    /// Generate complete Rust JNI glue module
    pub fn generate_rust_glue(&self, aidl: &AidlFile) -> TokenStream {
        let jni_functions = self.generate_jni_functions(aidl);
        let trait_def = self.generate_trait_definition(aidl);
        let service_singleton = self.generate_service_singleton(aidl);
        let helper_functions = self.generate_helper_functions(aidl);

        quote! {
            //! Auto-generated JNI glue code
            //! DO NOT EDIT MANUALLY - Generated from AIDL
            
            use jni::objects::{JClass, JObject, JString};
            use jni::sys::{jboolean, jbyte, jchar, jdouble, jfloat, jint, jlong, jshort, jstring};
            use jni::JNIEnv;
            use std::sync::OnceLock;
            
            #service_singleton
            
            #trait_def
            
            #jni_functions
            
            #helper_functions
        }
    }
    
    /// Generate helper functions (not from AIDL, but needed for client)
    fn generate_helper_functions(&self, aidl: &AidlFile) -> TokenStream {
        let package = &aidl.package;
        let interface_name = &aidl.interface_name;
        let service_name = interface_name.trim_start_matches('I');
        let fn_name = format_ident!(
            "Java_{}_service_{}Client_isServiceRunning",
            package.replace('.', "_"),
            service_name
        );
        
        quote! {
            /// JNI helper: Check if service is running
            /// Called from Java: {}Client.isServiceRunning()
            #[no_mangle]
            pub extern "C" fn #fn_name(_env: JNIEnv, _class: JClass) -> jboolean {
                // TODO: Implement actual service check
                // For now, return true if the library is loaded
                1
            }
        }
    }

    /// Generate the service singleton accessor
    fn generate_service_singleton(&self, aidl: &AidlFile) -> TokenStream {
        let trait_name = format_ident!("{}", aidl.interface_name.trim_start_matches('I'));
        
        quote! {
            /// Global service instance
            static SERVICE_INSTANCE: OnceLock<std::sync::Arc<dyn #trait_name + Send + Sync>> = OnceLock::new();
            
            /// Initialize the service instance
            pub fn init_service<S>(service: S) 
            where 
                S: #trait_name + Send + Sync + 'static,
            {
                let _ = SERVICE_INSTANCE.set(std::sync::Arc::new(service));
            }
            
            /// Get the service instance
            fn get_service() -> Option<std::sync::Arc<dyn #trait_name + Send + Sync>> {
                SERVICE_INSTANCE.get().cloned()
            }
        }
    }

    /// Generate trait definition from AIDL methods
    fn generate_trait_definition(&self, aidl: &AidlFile) -> TokenStream {
        let trait_name = format_ident!("{}", aidl.interface_name.trim_start_matches('I'));
        
        let methods: Vec<TokenStream> = aidl
            .methods
            .iter()
            .map(|m| self.generate_trait_method(m))
            .collect();

        quote! {
            /// Service trait - implement this for your service
            pub trait #trait_name: Send + Sync {
                #(#methods)*
            }
        }
    }

    fn generate_trait_method(&self, method: &AidlMethod) -> TokenStream {
        let method_name = format_ident!("{}", self.to_snake_case(&method.name));
        let ret_type = self.rust_return_type(&method.return_type);
        
        let args: Vec<TokenStream> = method
            .args
            .iter()
            .map(|arg| {
                let name = format_ident!("{}", arg.name);
                let ty = self.rust_arg_type(&arg.ty);
                quote! { #name: #ty }
            })
            .collect();

        quote! {
            fn #method_name(&self, #(#args),*) -> #ret_type;
        }
    }

    /// Generate all JNI functions
    fn generate_jni_functions(&self, aidl: &AidlFile) -> TokenStream {
        let functions: Vec<TokenStream> = aidl
            .methods
            .iter()
            .map(|m| self.generate_jni_function(aidl, m))
            .collect();

        quote! {
            #(#functions)*
        }
    }

    /// Generate a single JNI function
    fn generate_jni_function(&self, aidl: &AidlFile, method: &AidlMethod) -> TokenStream {
        let jni_name = self.jni_function_name(&aidl.package, &aidl.interface_name, &method.name);
        let fn_name = format_ident!("{}", jni_name);
        
        // Generate JNI argument list
        let jni_args = self.generate_jni_args(method);
        
        // Generate Rust function body
        let fn_body = self.generate_jni_body(method);
        
        // Return type for JNI
        let jni_ret = self.jni_return_type(&method.return_type);

        quote! {
            #[no_mangle]
            pub extern "C" fn #fn_name(#jni_args) #jni_ret {
                #fn_body
            }
        }
    }

    fn jni_function_name(&self, package: &str, interface: &str, method: &str) -> String {
        // Java native method naming: Java_package_Class_method
        // Capitalize first letter of method name for camelCase
        let pkg_part = package.replace('.', "_");
        let method_camel = if method.is_empty() {
            method.to_string()
        } else {
            let mut chars = method.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + &chars.as_str(),
                None => method.to_string(),
            }
        };
        format!("Java_{}_{}_native{}", pkg_part, interface, method_camel)
    }

    fn generate_jni_args(&self, method: &AidlMethod) -> TokenStream {
        let mut args = vec![quote! { mut env: JNIEnv }];
        
        // Add class/object parameter (this)
        args.push(quote! { _class: JClass });
        
        // Add method arguments
        for arg in &method.args {
            let jni_ty = self.jni_type_for_arg(&arg.ty);
            let name = format_ident!("{}", arg.name);
            args.push(quote! { #name: #jni_ty });
        }

        quote! { #(#args),* }
    }

    fn generate_jni_body(&self, method: &AidlMethod) -> TokenStream {
        let service_call = self.generate_service_call(method);
        let return_handling = self.generate_return_handling(&method.return_type);

        quote! {
            let service = match get_service() {
                Some(s) => s,
                None => {
                    env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                        .ok();
                    #return_handling
                }
            };
            
            #service_call
        }
    }

    fn generate_service_call(&self, method: &AidlMethod) -> TokenStream {
        let method_name = format_ident!("{}", self.to_snake_case(&method.name));
        
        // Convert JNI arguments to Rust types
        let arg_conversions: Vec<TokenStream> = method
            .args
            .iter()
            .map(|arg| self.convert_jni_arg_to_rust(arg))
            .collect();
        
        // Argument names for the call
        let arg_names: Vec<Ident> = method
            .args
            .iter()
            .map(|arg| format_ident!("{}_rust", arg.name))
            .collect();

        // Call service method
        let call = if matches!(method.return_type, AidlType::Void) {
            quote! {
                service.#method_name(#(#arg_names),*);
            }
        } else {
            quote! {
                let result = service.#method_name(#(#arg_names),*);
            }
        };

        // Convert result and return
        let result_handling = if matches!(method.return_type, AidlType::Void) {
            quote! {}
        } else {
            self.convert_rust_result_to_jni(&method.return_type)
        };

        quote! {
            #(#arg_conversions)*
            
            #call
            
            #result_handling
        }
    }

    fn convert_jni_arg_to_rust(&self, arg: &AidlArg) -> TokenStream {
        let jni_name = format_ident!("{}", arg.name);
        let rust_name = format_ident!("{}_rust", arg.name);
        
        match &arg.ty {
            AidlType::String => {
                quote! {
                    let #rust_name: String = env
                        .get_string(&#jni_name)
                        .expect("Invalid UTF-8")
                        .into();
                }
            }
            AidlType::Boolean => {
                quote! { let #rust_name = #jni_name != 0; }
            }
            AidlType::Int => {
                quote! { let #rust_name = #jni_name; }
            }
            AidlType::Long => {
                quote! { let #rust_name = #jni_name; }
            }
            AidlType::Byte => {
                quote! { let #rust_name = #jni_name as i8; }
            }
            AidlType::Short => {
                quote! { let #rust_name = #jni_name; }
            }
            AidlType::Float => {
                quote! { let #rust_name = #jni_name; }
            }
            AidlType::Double => {
                quote! { let #rust_name = #jni_name; }
            }
            AidlType::Char => {
                quote! { let #rust_name = #jni_name as u16; }
            }
            _ => {
                // For complex types, we'll need to handle parcelables
                // For now, use jobject and convert via JNI
                quote! {
                    // TODO: Handle complex type conversion
                    let #rust_name = unimplemented!("Complex type conversion");
                }
            }
        }
    }

    fn convert_rust_result_to_jni(&self, ty: &AidlType) -> TokenStream {
        match ty {
            AidlType::String => {
                quote! {
                    match result {
                        Ok(s) => {
                            let jstring = env.new_string(s)
                                .expect("Failed to create Java string");
                            jstring.into_raw()
                        }
                        Err(e) => {
                            env.throw_new("java/lang/RuntimeException", &format!("{}", e))
                                .ok();
                            std::ptr::null_mut()
                        }
                    }
                }
            }
            AidlType::Boolean => {
                quote! {
                    match result {
                        Ok(v) => v as jboolean,
                        Err(_) => 0,
                    }
                }
            }
            AidlType::Int => {
                quote! {
                    match result {
                        Ok(v) => v,
                        Err(_) => 0,
                    }
                }
            }
            AidlType::Long => {
                quote! {
                    match result {
                        Ok(v) => v,
                        Err(_) => 0,
                    }
                }
            }
            AidlType::Void => quote! {},
            _ => {
                quote! {
                    // TODO: Handle complex return type
                    unimplemented!("Complex return type conversion")
                }
            }
        }
    }

    fn generate_return_handling(&self, ty: &AidlType) -> TokenStream {
        match ty {
            AidlType::String => quote! { return std::ptr::null_mut(); },
            AidlType::Boolean => quote! { return 0; },
            AidlType::Int => quote! { return 0; },
            AidlType::Long => quote! { return 0; },
            AidlType::Byte => quote! { return 0; },
            AidlType::Short => quote! { return 0; },
            AidlType::Float => quote! { return 0.0; },
            AidlType::Double => quote! { return 0.0; },
            AidlType::Char => quote! { return 0; },
            AidlType::Void => quote! { return; },
            _ => quote! { return std::ptr::null_mut(); },
        }
    }

    // Type mapping helpers

    fn rust_return_type(&self, ty: &AidlType) -> TokenStream {
        match ty {
            AidlType::Void => quote! { () },
            AidlType::String => quote! { Result<String, Box<dyn std::error::Error>> },
            AidlType::Boolean => quote! { Result<bool, Box<dyn std::error::Error>> },
            AidlType::Int => quote! { Result<i32, Box<dyn std::error::Error>> },
            AidlType::Long => quote! { Result<i64, Box<dyn std::error::Error>> },
            AidlType::Byte => quote! { Result<i8, Box<dyn std::error::Error>> },
            AidlType::Short => quote! { Result<i16, Box<dyn std::error::Error>> },
            AidlType::Float => quote! { Result<f32, Box<dyn std::error::Error>> },
            AidlType::Double => quote! { Result<f64, Box<dyn std::error::Error>> },
            AidlType::Char => quote! { Result<u16, Box<dyn std::error::Error>> },
            _ => quote! { Result<(), Box<dyn std::error::Error>> },
        }
    }

    fn rust_arg_type(&self, ty: &AidlType) -> TokenStream {
        match ty {
            AidlType::String => quote! { &str },
            AidlType::Boolean => quote! { bool },
            AidlType::Int => quote! { i32 },
            AidlType::Long => quote! { i64 },
            AidlType::Byte => quote! { i8 },
            AidlType::Short => quote! { i16 },
            AidlType::Float => quote! { f32 },
            AidlType::Double => quote! { f64 },
            AidlType::Char => quote! { u16 },
            AidlType::List(inner) => {
                let inner_ty = self.rust_inner_type(inner);
                quote! { Vec<#inner_ty> }
            }
            AidlType::Parcelable(name) => {
                // For interface callbacks, use a trait object
                let ident = format_ident!("{}", name);
                quote! { &#ident }
            }
            _ => quote! { /* TODO: Complex type */ },
        }
    }

    fn rust_inner_type(&self, ty: &AidlType) -> TokenStream {
        match ty {
            AidlType::String => quote! { String },
            AidlType::Int => quote! { i32 },
            AidlType::Long => quote! { i64 },
            AidlType::Boolean => quote! { bool },
            AidlType::Parcelable(name) => {
                let ident = format_ident!("{}", name);
                quote! { #ident }
            }
            _ => quote! { /* TODO */ },
        }
    }

    fn jni_type_for_arg(&self, ty: &AidlType) -> TokenStream {
        match ty {
            AidlType::String => quote! { JString },
            AidlType::Boolean => quote! { jboolean },
            AidlType::Int => quote! { jint },
            AidlType::Long => quote! { jlong },
            AidlType::Byte => quote! { jbyte },
            AidlType::Short => quote! { jshort },
            AidlType::Float => quote! { jfloat },
            AidlType::Double => quote! { jdouble },
            AidlType::Char => quote! { jchar },
            AidlType::List(_) => quote! { JObject },
            AidlType::Parcelable(_) => quote! { JObject },
            _ => quote! { JObject },
        }
    }

    fn jni_return_type(&self, ty: &AidlType) -> TokenStream {
        match ty {
            AidlType::Void => quote! {},
            AidlType::String => quote! { -> jstring },
            AidlType::Boolean => quote! { -> jboolean },
            AidlType::Int => quote! { -> jint },
            AidlType::Long => quote! { -> jlong },
            AidlType::Byte => quote! { -> jbyte },
            AidlType::Short => quote! { -> jshort },
            AidlType::Float => quote! { -> jfloat },
            AidlType::Double => quote! { -> jdouble },
            AidlType::Char => quote! { -> jchar },
            _ => quote! { -> jobject },
        }
    }

    fn to_snake_case(&self, s: &str) -> String {
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
}

/// Generate Java Stub class with native methods
pub fn generate_java_stub(aidl: &AidlFile) -> String {
    let package = &aidl.package;
    let interface_name = &aidl.interface_name;
    
    let native_methods: Vec<String> = aidl
        .methods
        .iter()
        .map(|m| generate_java_native_method(m))
        .collect();

    let interface_methods: Vec<String> = aidl
        .methods
        .iter()
        .map(|m| generate_java_interface_method(m))
        .collect();

    format!(
        r#"package {package};

import android.os.Binder;
import android.os.IBinder;
import android.os.IInterface;
import android.os.Parcel;
import android.os.RemoteException;

/**
 * Auto-generated AIDL interface stub.
 * DO NOT EDIT MANUALLY - Generated from AIDL
 */
public interface {interface_name} extends IInterface {{
    
    public static abstract class Stub extends Binder implements {interface_name} {{
        private static final String DESCRIPTOR = "{package}.{interface_name}";
        
        static {{
            System.loadLibrary("foundframe");
        }}
        
        public Stub() {{
            this.attachInterface(this, DESCRIPTOR);
        }}
        
        public static {interface_name} asInterface(IBinder obj) {{
            if (obj == null) {{
                return null;
            }}
            IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
            if ((iin != null) && (iin instanceof {interface_name})) {{
                return (({interface_name}) iin);
            }}
            return new Proxy(obj);
        }}
        
        @Override
        public IBinder asBinder() {{
            return this;
        }}
        
        @Override
        protected boolean onTransact(int code, Parcel data, Parcel reply, int flags) throws RemoteException {{
            switch (code) {{
                case INTERFACE_TRANSACTION: {{
                    reply.writeString(DESCRIPTOR);
                    return true;
                }}
                // Transaction dispatch handled by native layer
                default:
                    return super.onTransact(code, data, reply, flags);
            }}
        }}
        
        // Native method declarations
        {native_methods}
        
        private static class Proxy implements {interface_name} {{
            private final IBinder mRemote;
            
            Proxy(IBinder remote) {{
                mRemote = remote;
            }}
            
            @Override
            public IBinder asBinder() {{
                return mRemote;
            }}
            
            public String getInterfaceDescriptor() {{
                return DESCRIPTOR;
            }}
            
            {interface_methods}
        }}
    }}
    
    // Interface methods
    {interface_methods}
}}
"#,
        package = package,
        interface_name = interface_name,
        native_methods = native_methods.join("\n        "),
        interface_methods = interface_methods.join("\n    "),
    )
}

/// Generate Java Client helper class
pub fn generate_java_client(aidl: &AidlFile) -> String {
    let package = &aidl.package;
    let interface_name = &aidl.interface_name;
    let client_class_name = interface_name.trim_start_matches('I').to_string() + "Client";
    let service_class_name = interface_name.trim_start_matches('I').to_string() + "Service";
    
    format!(
        r#"package {package}.service;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.Process;
import android.util.Log;

import {package}.{interface_name};

/**
 * Auto-generated client helper for {interface_name}.
 * DO NOT EDIT MANUALLY - Generated from AIDL
 */
public class {client_class_name} {{
    private static final String TAG = "O19-ANDROID";
    
    static {{
        System.loadLibrary("foundframe");
    }}
    
    private final Context context;
    private {interface_name} service;
    private ConnectionCallback callback;
    private boolean bound = false;
    
    public interface ConnectionCallback {{
        void onConnected({interface_name} service);
        void onDisconnected();
        void onError(String error);
    }}
    
    private final ServiceConnection connection = new ServiceConnection() {{
        @Override
        public void onServiceConnected(ComponentName name, IBinder binder) {{
            Log.i(TAG, "[{client_class_name}] Service connected");
            service = {interface_name}.Stub.asInterface(binder);
            bound = true;
            if (callback != null) {{
                callback.onConnected(service);
            }}
        }}
        
        @Override
        public void onServiceDisconnected(ComponentName name) {{
            Log.i(TAG, "[{client_class_name}] Service disconnected");
            service = null;
            bound = false;
            if (callback != null) {{
                callback.onDisconnected();
            }}
        }}
    }};
    
    public {client_class_name}(Context context) {{
        this.context = context.getApplicationContext();
    }}
    
    /**
     * Connect to the service
     */
    public boolean connect(ConnectionCallback callback) {{
        this.callback = callback;
        
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(
            context.getPackageName(),
            "{package}.service.{service_class_name}"
        ));
        
        try {{
            bound = context.bindService(intent, connection, Context.BIND_AUTO_CREATE);
            if (!bound) {{
                callback.onError("Failed to bind to service");
            }}
            return bound;
        }} catch (SecurityException e) {{
            callback.onError("Security exception: " + e.getMessage());
            return false;
        }}
    }}
    
    /**
     * Disconnect from the service
     */
    public void disconnect() {{
        if (bound) {{
            context.unbindService(connection);
            bound = false;
            service = null;
        }}
    }}
    
    /**
     * Check if currently connected
     */
    public boolean isConnected() {{
        return bound && service != null;
    }}
    
    /**
     * Get the service interface (null if not connected)
     */
    public {interface_name} getService() {{
        return service;
    }}
    
    /**
     * Ensure the service is started
     */
    public boolean ensureStarted(String alias) {{
        Log.i(TAG, "[{client_class_name}] ensureStarted() called in pid " + Process.myPid());
        
        if (isServiceRunning()) {{
            Log.d(TAG, "[{client_class_name}] Service already running");
            return true;
        }}
        
        Log.i(TAG, "[{client_class_name}] Starting {service_class_name} with alias: " + alias);
        
        Intent intent = new Intent(context, {service_class_name}.class);
        intent.putExtra("alias", alias);
        context.startService(intent);
        
        // Wait a bit for service to start
        int attempts = 0;
        while (attempts < 10) {{
            try {{
                Thread.sleep(100);
            }} catch (InterruptedException e) {{
                Thread.currentThread().interrupt();
                return false;
            }}
            Log.d(TAG, "[{client_class_name}] Checking if service started (attempt " + (attempts + 1) + "/10)");
            if (isServiceRunning()) {{
                Log.i(TAG, "[{client_class_name}] Service started successfully after " + (attempts + 1) + " attempts");
                return true;
            }}
            attempts++;
        }}
        
        Log.e(TAG, "[{client_class_name}] Service failed to start after 10 attempts");
        return false;
    }}
    
    /**
     * Check if service is running
     */
    public boolean isRunning() {{
        return isServiceRunning();
    }}
    
    /**
     * Native method to check if service is running
     */
    private static native boolean isServiceRunning();
}}
"#,
        package = package,
        interface_name = interface_name,
        client_class_name = client_class_name,
        service_class_name = service_class_name,
    )
}

fn generate_java_native_method(method: &AidlMethod) -> String {
    let method_name = &method.name;
    let method_camel = to_camel_case(method_name);
    let ret_type = java_type(&method.return_type);
    
    let args: Vec<String> = method
        .args
        .iter()
        .map(|arg| {
            let ty = java_type(&arg.ty);
            let name = &arg.name;
            format!("{} {}", ty, name)
        })
        .collect();

    format!(
        "private native {} native{}({});",
        ret_type,
        method_camel,
        args.join(", ")
    )
}

fn generate_java_interface_method(method: &AidlMethod) -> String {
    let method_name = &method.name;
    let ret_type = java_type(&method.return_type);
    
    let args: Vec<String> = method
        .args
        .iter()
        .map(|arg| {
            let ty = java_type(&arg.ty);
            let name = &arg.name;
            format!("{} {}", ty, name)
        })
        .collect();

    let throws = if !matches!(method.return_type, AidlType::Void) {
        " throws RemoteException"
    } else {
        ""
    };

    format!(
        "{} {}({}){};",
        ret_type,
        method_name,
        args.join(", "),
        throws
    )
}

fn java_type(ty: &AidlType) -> String {
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
        AidlType::List(inner) => format!("List<{}>", java_inner_type(inner)),
        AidlType::Map(k, v) => format!("Map<{}, {}>", java_inner_type(k), java_inner_type(v)),
        AidlType::Parcelable(name) => name.clone(),
        AidlType::Interface(name) => name.clone(),
        AidlType::Array(inner) => format!("{}[]", java_type(inner)),
    }
}

fn java_inner_type(ty: &AidlType) -> String {
    match ty {
        AidlType::String => "String".to_string(),
        AidlType::Int => "Integer".to_string(),
        AidlType::Long => "Long".to_string(),
        AidlType::Boolean => "Boolean".to_string(),
        AidlType::Parcelable(name) => name.clone(),
        _ => "Object".to_string(),
    }
}

/// Convert a method name to CamelCase (for Java native method names)
fn to_camel_case(s: &str) -> String {
    if s.is_empty() {
        return s.to_string();
    }
    let mut chars = s.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        None => s.to_string(),
    }
}
