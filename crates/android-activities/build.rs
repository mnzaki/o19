use std::path::PathBuf;

fn list_aidl_sources(dir: &PathBuf) -> Vec<PathBuf> {
  let mut sources = Vec::new();
  for entry in dir.read_dir().unwrap() {
    let entry = entry.unwrap();
    let path = entry.path();
    if path.is_dir() {
      sources.extend(list_aidl_sources(&path));
    } else if path.extension().unwrap() == "aidl" {
      sources.push(path);
    }
  }
  sources
}

fn main() {
  //println!("WHAT: {:?}", std::env::var_os("OUT_DIR").unwrap());
  //std::process::exit(1);

  let aidl_dir = PathBuf::from("./android/aidl");
  let main_output = PathBuf::from("ty_circulari_o19.rs");

  // list all files in the AIDL directory recursively
  let aidl_sources = list_aidl_sources(&aidl_dir.clone());

  // Tell cargo to rerun if AIDL files change
  println!("cargo:rerun-if-changed={:?}", aidl_dir);

  println!(
    "cargo:info=AIDL source dir: {:?}",
    aidl_dir.canonicalize().unwrap_or(aidl_dir.clone())
  );

  // Try to generate Rust bindings from AIDL
  let mut generation = rsbinder_aidl::Builder::new().output(main_output);

  for aidl_entry_point in &aidl_sources {
    generation = generation.source(aidl_entry_point);
  }

  generation.generate().unwrap();
}
