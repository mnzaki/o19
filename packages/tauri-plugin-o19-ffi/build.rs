const COMMANDS: &[&str] = &[
  "ping",
  "run_sql",
  "url_preview_json",
  "html_preview_json",
  "media_preview_json",
  "convert_jpeg_to_webp",
  "compress_webp_to_size",
  "request_permissions",
  "add_bootstrap_node",
];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .ios_path("ios")
    .build();
}
