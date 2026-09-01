use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;
use tokio::sync::RwLock;

pub const SALT_ROTATION_INTERVAL: Duration = Duration::from_secs(24 * 60 * 60);

use crate::config::Config;
use crate::ratelimit::RateLimiter;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Config,
    pub daily_salt: Arc<RwLock<String>>,
    /// Reverted back to the shared in-memory epoch (see the
    /// persist_session_epoch and add_sessions_table migrations for the full
    /// history): per-session logout via a `sessions` table lookup added a DB
    /// write to every login and a DB read to every single admin request,
    /// which on this cross-region DB connection was real, user-visible
    /// latency and a new failure path on login. Not worth it for a
    /// single-admin site — logging out signs out every device again, but
    /// authenticating a request costs nothing.
    pub session_epoch: Arc<RwLock<u64>>,
    /// Keyed by client IP. 5 attempts / 5 minutes — tight, since a real
    /// admin mistyping a password a handful of times is the only legitimate
    /// case this could ever block.
    pub login_limiter: Arc<RateLimiter>,
    /// Keyed by client IP. 120 events / minute — generous, sized for a
    /// real visitor browsing quickly, not for scripted spam.
    pub event_limiter: Arc<RateLimiter>,
}

pub fn generate_salt() -> String {
    let random_bytes: [u8; 32] = rand::random();
    blake3::hash(&random_bytes).to_hex().to_string()
}
