use crate::schema::*;

pub fn generate_table_module(table: &TableDef) -> Result<String, Box<dyn std::error::Error>> {
    let mut output = String::new();
    
    // Module header
    output.push_str(&format!("// Generated ORM for {}\n", table.name));
    output.push_str("use std::sync::OnceLock;\n");
    output.push_str("use rusqlite::{Connection, Statement, Result};\n\n");
    
    // Generate struct import
    let struct_name = table.name.split('_')
        .map(|w| w.chars().next().unwrap().to_uppercase().to_string() + &w[1..])
        .collect::<String>();
    
    output.push_str(&format!("use super::{};\n\n", struct_name));
    
    // Generate queries
    let queries = generate_queries(table, &struct_name);
    output.push_str(&queries);
    
    Ok(output)
}

fn generate_queries(table: &TableDef, struct_name: &str) -> String {
    let mut output = String::new();
    
    // get_by_id
    if let Some(pk) = table.primary_key {
        output.push_str(&format!(r#"
/// Get {} by {}
pub fn get_by_id(conn: &Connection, id: i64) -> Result<Option<{}>> {{
    static STMT: OnceLock<Statement> = OnceLock::new();
    let stmt = STMT.get_or_init(|| {{
        conn.prepare("SELECT * FROM {} WHERE {} = ?")
            .expect("Failed to prepare statement")
    }});
    
    let mut stmt = stmt.raw_query(rusqlite::params![id]);
    // ... deserialization
    Ok(None) // TODO: deserialize
}}
"#, struct_name, pk, struct_name, table.name, pk));
    }
    
    // list_all
    output.push_str(&format!(r#"
/// List all {}
pub fn list_all(conn: &Connection) -> Result<Vec<{}>> {{
    static STMT: OnceLock<Statement> = OnceLock::new();
    let stmt = STMT.get_or_init(|| {{
        conn.prepare("SELECT * FROM {}")
            .expect("Failed to prepare statement")
    }});
    
    // ... deserialization
    Ok(vec![])
}}
"#, table.name, struct_name, table.name));
    
    output
}
