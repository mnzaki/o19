use std::{
  env, fs,
  path::{Path, PathBuf},
};

fn main() {
  generate_migrations();
}

fn generate_migrations() {
  let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
  let out_file = out_dir.join("generated_migrations.rs");
  let migrations_dir = Path::new("migrations");

  println!("cargo:rerun-if-changed=src-tauri/migrations");

  let mut contents = String::from("const MIGRATIONS: &[&str] = &[\n");

  for entry in fs::read_dir(migrations_dir).unwrap() {
    let entry = entry.unwrap();
    let path = entry.path();

    if path.extension().and_then(|e| e.to_str()) != Some("sql") {
      continue;
    }

    let file_name = path.file_name().unwrap().to_str().unwrap().to_owned();

    // Copy the .sql file into OUT_DIR
    let dest_path = out_dir.join(&file_name);
    fs::copy(&path, &dest_path).expect("❌ Failed to copy SQL migration to OUT_DIR");

    // Include the copied file (now relative path is valid)
    contents.push_str(&format!(
      "include_str!(\"{}\"),\n",
      dest_path.file_name().unwrap().to_str().unwrap()
    ));
  }

  contents.push_str("];\n");

  fs::write(&out_file, contents).expect("❌ Failed to write generated_migrations.rs");
  println!("✅ Generated: {:?}", out_file);
}
