use o19_foundframe::Foundframe;
use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Platform;
#[cfg(mobile)]
use mobile::Platform;

pub trait InternalApiExtension<R: Runtime> {
  fn api(&self) -> &Platform<R>;
}

impl<R: Runtime, T: Manager<R>> InternalApiExtension<R> for T {
  fn api(&self) -> &Platform<R> {
    self.state::<Platform<R>>().inner()
  }
}

pub struct AppState<R: Runtime> {
  platform: Platform<R>,
  foundframe: Foundframe
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("o19-ff")
    .invoke_handler(tauri::generate_handler![
      commands::ping,
      commands::run_sql,
      commands::url_preview_json,
      commands::html_preview_json,
      commands::media_preview_json,
      commands::convert_jpeg_to_webp,
      commands::compress_webp_to_size,
      commands::request_permissions
    ])
    .setup(|app, api| {
      #[cfg(mobile)]
      let platform = mobile::init(app, api)?;

      #[cfg(desktop)]
      let platform = desktop::init(app, api)?;

      let foundframe = tauri::async_runtime::block_on(async move {
          o19_foundframe::init().await
      }).unwrap();

      app.manage(AppState {
          platform,
          foundframe
      });

      Ok(())
    })
    .build()
}

#[cfg(target_os = "android")]
use jni::JNIEnv;
#[cfg(target_os = "android")]
use jni::objects::{JClass, JObject};

#[cfg(target_os = "android")]
#[unsafe(no_mangle)]
pub extern "system" fn Java_ty_circulari_o19_ffi_initRustlsPlatformVerifier(
    mut env: JNIEnv,
    _class: JClass,
    context: JObject,
) {
    // This runs inside the plugin's Rust code, but it affects the global process
    match rustls_platform_verifier::android::init_hosted(&mut env, context) {
        Ok(_) => println!("ApiPlugin JNI: Rustls Platform Verifier Initialized!"),
        Err(e) => println!("ApiPlugin JNI: Failed to init verifier: {}", e),
    }
}
