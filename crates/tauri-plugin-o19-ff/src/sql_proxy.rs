// Based on https://github.com/meditto/tauri-drizzle-proxy/
// Adapted to use the sqlite crate (same as radicle-node)

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;

use foundframe_to_sql::Database;

#[derive(Debug, Deserialize)]
pub struct SqlQuery {
  pub sql: String,
  pub params: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct SqlRow {
  pub columns: Vec<String>,
  pub values: Vec<serde_json::Value>,
}

/// Execute SQL query against the database at db_path
/// This is the core logic, adapted for sqlite crate
pub fn execute_sql(db_path: &Path, query: SqlQuery) -> crate::Result<Vec<SqlRow>> {
  // Open database (creates if doesn't exist)
  let db = Database::open(db_path)?;
  
  // Get the underlying sqlite connection
  // Note: This requires access to the internal connection
  // We're using the sqlite crate's ConnectionThreadSafe
  execute_sql_with_db(db, query)
}

/// Execute SQL using an already opened database.
/// This is used when we have access to the managed database state.
pub fn execute_sql_with_db(db: Database, query: SqlQuery) -> crate::Result<Vec<SqlRow>> {
  // Access the underlying connection through the Database
  // We need to use the connection directly
  // The Database wraps Arc<ConnectionThreadSafe>, so we need to work with that
  
  // For now, we open a new connection to the same database
  // (SQLite handles multiple connections to same file safely)
  // TODO: In the future, we should expose a way to get a connection from Database
  let conn = sqlite::Connection::open_thread_safe(
    db.db_path().unwrap_or_else(|| Path::new(":memory:"))
  )?;
  
  // Prepare statement
  let mut stmt = conn.prepare(&query.sql)?;
  
  // Capture column names from statement before iteration
  let column_names: Vec<String> = stmt.column_names()
    .iter()
    .map(|s: &String| s.to_string())
    .collect();
  
  // Bind parameters (sqlite uses 1-based indexing)
  for (i, param) in query.params.iter().enumerate() {
    bind_value(&mut stmt, i + 1, param)?;
  }
  
  // Collect results
  let mut rows = Vec::new();
  
  // Iterate through results using into_iter()
  for row_result in stmt.into_iter() {
    let row = row_result.map_err(|e: sqlite::Error| crate::Error::Sql(e.to_string()))?;
    
    // Read values
    let values = read_row_values(&row, column_names.len())?;
    
    rows.push(SqlRow {
      columns: column_names.clone(),
      values,
    });
  }
  
  Ok(rows)
}

/// Bind a JSON value to a statement parameter (1-based index)
fn bind_value(stmt: &mut sqlite::Statement<'_>, index: usize, value: &Value) -> crate::Result<()> {
  let sql_value = json_to_sqlite_value(value)?;
  stmt.bind((index, sql_value))?;
  Ok(())
}

/// Convert JSON value to sqlite Value
fn json_to_sqlite_value(value: &Value) -> crate::Result<sqlite::Value> {
  match value {
    Value::Null => Ok(sqlite::Value::Null),
    Value::Bool(b) => Ok(sqlite::Value::Integer(*b as i64)),
    Value::Number(n) => {
      if let Some(i) = n.as_i64() {
        Ok(sqlite::Value::Integer(i))
      } else if let Some(f) = n.as_f64() {
        Ok(sqlite::Value::Float(f))
      } else {
        Err(crate::Error::Sql("Invalid number".to_string()))
      }
    }
    Value::String(s) => Ok(sqlite::Value::String(s.clone())),
    Value::Array(_) | Value::Object(_) => {
      // Serialize complex types as JSON strings
      Ok(sqlite::Value::String(value.to_string()))
    }
  }
}

/// Read all values from a row
fn read_row_values(row: &sqlite::Row, column_count: usize) -> crate::Result<Vec<Value>> {
  let mut values = Vec::with_capacity(column_count);
  
  for i in 0..column_count {
    let value = read_value_at(row, i)?;
    values.push(value);
  }
  
  Ok(values)
}

/// Read value at specific column index
fn read_value_at(row: &sqlite::Row, index: usize) -> crate::Result<Value> {
  // Try to read as different types
  // Order matters: try more specific types first
  
  // Try null
  match row.try_read::<Option<i64>, _>(index) {
    Ok(None) => return Ok(Value::Null),
    Ok(Some(i)) => return Ok(Value::Number(i.into())),
    Err(_) => {}
  }
  
  // Try float
  if let Ok(v) = row.try_read::<f64, _>(index) {
    if let Some(num) = serde_json::Number::from_f64(v) {
      return Ok(Value::Number(num));
    }
    return Ok(Value::Null);
  }
  
  // Try string
  if let Ok(v) = row.try_read::<&str, _>(index) {
    return Ok(Value::String(v.to_string()));
  }
  
  // Try blob (binary data) - base64 encode for JSON compatibility
  if let Ok(v) = row.try_read::<&[u8], _>(index) {
    use base64::Engine;
    return Ok(Value::String(base64::engine::general_purpose::STANDARD.encode(v)));
  }
  
  Ok(Value::Null)
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::time::SystemTime;
  
  #[test]
  fn test_execute_sql() {
    let temp_dir = std::env::temp_dir();
    let db_path = temp_dir.join(format!("test_sql_proxy_{}.db", 
      SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_millis()
    ));
    
    // Clean up any existing test db
    let _ = std::fs::remove_file(&db_path);
    
    // Create a test table
    let create_query = SqlQuery {
      sql: "CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, active INTEGER)".to_string(),
      params: vec![],
    };
    let result = execute_sql(&db_path, create_query).unwrap();
    assert!(result.is_empty());
    
    // Insert data
    let insert_query = SqlQuery {
      sql: "INSERT INTO test (id, name, active) VALUES (?1, ?2, ?3)".to_string(),
      params: vec![
        Value::Number(1.into()),
        Value::String("hello".to_string()),
        Value::Bool(true),
      ],
    };
    let result = execute_sql(&db_path, insert_query).unwrap();
    assert!(result.is_empty());
    
    // Select data
    let select_query = SqlQuery {
      sql: "SELECT * FROM test WHERE id = ?1".to_string(),
      params: vec![Value::Number(1.into())],
    };
    let result = execute_sql(&db_path, select_query).unwrap();
    assert_eq!(result.len(), 1);
    
    let row = &result[0];
    assert_eq!(row.values.len(), 3);
    assert_eq!(row.values[0], Value::Number(1.into()));
    assert_eq!(row.values[1], Value::String("hello".to_string()));
    
    // Clean up
    let _ = std::fs::remove_file(&db_path);
  }
}
