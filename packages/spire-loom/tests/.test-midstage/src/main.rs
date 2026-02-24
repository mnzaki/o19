use std::env;
use std::fs;
use std::path::Path;

mod schema;
mod codegen;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let output_dir = env::var("OUTPUT_DIR")
        .expect("OUTPUT_DIR environment variable required");
    
    fs::create_dir_all(&output_dir)?;
    
    // Generate code for each table
    for table in &schema::TABLES {
        let generated = codegen::generate_table_module(table)?;
        
        let output_path = Path::new(&output_dir)
            .join(format!("{}.gen.rs", table.name));
        
        fs::write(&output_path, generated)?;
        println!("GENERATED:{}", output_path.display());
    }
    
    Ok(())
}
