use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;
use tokio::sync::RwLock;

pub const SALT_ROTATION_INTERVAL: Duration = Duration::from_secs(24 * 60 * 60);

use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Config,
    pub daily_salt: Arc<RwLock<String>>,
    pub session_epoch: Arc<RwLock<u64>>,
}

pub fn generate_salt() -> String {
    let random_bytes: [u8; 32] = rand::random();
    blake3::hash(&random_bytes).to_hex().to_string()
}
