use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;
use tokio::sync::RwLock;

pub const SALT_ROTATION_INTERVAL: Duration = Duration::from_secs(24 * 60 * 60);

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub daily_salt: Arc<RwLock<String>>,
}

pub fn generate_salt() -> String {
    let random_bytes: [u8; 32] = rand::random();
    blake3::hash(&random_bytes).to_hex().to_string()
}
