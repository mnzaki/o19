// Based on https://github.com/meditto/tauri-drizzle-proxy/
// with fixes for edge cases and abstracted away from Tauri

use base64::engine::general_purpose;
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{
    query::Query,
    sqlite::{SqliteArguments, SqliteRow},
    Column, Row, Sqlite, SqlitePool, TypeInfo,
};
use std::path::Path;

use crate::error::{Error, Result};

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
/// This is the core logic, Tauri-agnostic
pub async fn execute_sql(db_path: &Path, query: SqlQuery) -> Result<Vec<SqlRow>> {
    let uri = format!("sqlite://{}", db_path.display());

    if let Some(parent) = db_path.parent() {
        if !parent.exists() {
            println!("[DRIZZLE_PROXY] Creating parent directory for database");
            std::fs::create_dir_all(parent)?;
        }
    }

    let pool = SqlitePool::connect(&uri)
        .await
        .map_err(|e| {
            println!("[DRIZZLE_PROXY] FAILED to connect to DB: {}", e);
            Error::DatabaseConnection(e.to_string())
        })?;

    let mut q = sqlx::query(&query.sql);
    for param in query.params.iter() {
        q = bind_value(q, param);
    }

    let rows = q
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            println!("[DRIZZLE_PROXY] Query FAILED: {}", e);
            Error::QueryFailed(e.to_string())
        })?;

    let result: Vec<SqlRow> = rows
        .iter()
        .map(|row| {
            let columns = row
                .columns()
                .iter()
                .map(|c| c.name().to_string())
                .collect::<Vec<_>>();

            let values = (0..row.len())
                .map(|i| {
                    match row.try_get_raw(i) {
                        Ok(_) => sqlx_value_to_json(row, i),
                        Err(_) => Value::Null,
                    }
                })
                .collect::<Vec<_>>();

            SqlRow { columns, values }
        })
        .collect();

    // Close the pool explicitly to avoid any connection issues
    pool.close().await;

    Ok(result)
}

fn bind_value<'q>(
    query: Query<'q, Sqlite, SqliteArguments<'q>>,
    value: &'q Value,
) -> Query<'q, Sqlite, SqliteArguments<'q>> {
    match value {
        Value::Null => query.bind(None::<String>),
        Value::Bool(b) => query.bind(*b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                query.bind(i)
            } else if let Some(f) = n.as_f64() {
                query.bind(f)
            } else {
                query.bind(None::<String>)
            }
        }
        Value::String(s) => query.bind(s),
        _ => {
            println!("[DRIZZLE_PROXY] Binding unknown type as NULL: {:?}", value);
            query.bind(None::<String>)
        }
    }
}

fn sqlx_value_to_json(row: &SqliteRow, index: usize) -> Value {
    let column = row.column(index);
    let type_name = column.type_info().name();

    // For NULL type (computed columns like COUNT(*)), try INTEGER first, then fall back
    if type_name == "NULL" || type_name.is_empty() {
        if let Ok(val) = row.try_get::<i64, _>(index) {
            return Value::from(val);
        }
        if let Ok(val) = row.try_get::<f64, _>(index) {
            return Value::from(val);
        }
        if let Ok(val) = row.try_get::<String, _>(index) {
            return Value::String(val);
        }
        return Value::Null;
    }

    match type_name {
        "INTEGER" => row
            .try_get::<i64, _>(index)
            .map(Value::from)
            .unwrap_or(Value::Null),
        "REAL" => row
            .try_get::<f64, _>(index)
            .map(Value::from)
            .unwrap_or(Value::Null),
        "TEXT" => row
            .try_get::<String, _>(index)
            .map(Value::String)
            .unwrap_or(Value::Null),
        "BLOB" => row
            .try_get::<Vec<u8>, _>(index)
            .map(|bytes| Value::String(general_purpose::STANDARD.encode(&bytes)))
            .unwrap_or(Value::Null),
        _ => {
            // Unknown type, try them all
            if let Ok(val) = row.try_get::<i64, _>(index) {
                return Value::from(val);
            }
            if let Ok(val) = row.try_get::<f64, _>(index) {
                return Value::from(val);
            }
            if let Ok(val) = row.try_get::<String, _>(index) {
                return Value::String(val);
            }
            Value::Null
        }
    }
}
