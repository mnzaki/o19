use tracing_subscriber::{EnvFilter, prelude::*};

pub mod device;
pub mod error;
pub mod pkb;
pub mod preview;
pub mod radicle;
pub mod signal;
pub mod thestream;

pub mod log;

pub use error::{Error, Result};

pub struct Foundframe {}

pub async fn init(_pkb_path: &str) -> Result<Foundframe> {
    // concat path
    let runtime = radicle::run_node(
        radicle::NodeOptions::new()
            .listen("0.0.0.0:6776".parse().map_err(|e| Error::Other(format!("Invalid address: {e}")))?)
    )?;
    runtime.run()?; // returns Result, doesn't exit

    Ok(Foundframe {})
}

pub fn setup_logging() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stderr))
        .with(EnvFilter::from_default_env())
        .try_init()
        .ok();
}
