use tracing_subscriber::{prelude::*, EnvFilter};

pub mod error;
pub mod preview;
pub mod sql_proxy;
pub mod storage;

pub mod log;

pub use error::{Error, Result};

pub struct Foundframe {
}

pub async fn init() -> Result<Foundframe> {
    Ok(Foundframe {
    })
}

pub fn setup_logging() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stderr))
        .with(EnvFilter::from_default_env())
        .try_init()
        .ok();
}

