const COMMANDS: &[&str] = &[
  "ping",
  "run_sql",
  "url_preview_json",
  "html_preview_json",
  "media_preview_json",
  "convert_jpeg_to_webp",
  "compress_webp_to_size",
  "request_permissions",
  "start_camera",
  "stop_camera",
  "capture_photo",
  "set_camera_mode",
  "is_camera_active",
  "request_camera_permissions",
  "check_camera_permissions",
  "generate_pairing_qr",
  "parse_pairing_qr",
  "confirm_pairing",
  "list_paired_devices",
  "check_followers_and_pair",
  "unpair_device",
];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .ios_path("ios")
    .build();
}
