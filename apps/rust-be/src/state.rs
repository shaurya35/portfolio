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
    /// Keyed by client IP. 5 attempts / 5 minutes — tight, since a real
    /// admin mistyping a password a handful of times is the only legitimate
    /// case this could ever block.
    pub login_limiter: Arc<RateLimiter>,
    /// Keyed by client IP. 120 events / minute — generous, sized for a
    /// real visitor browsing quickly, not for scripted spam.
    pub event_limiter: Arc<RateLimiter>,
}

fn random_hex() -> String {
    let random_bytes: [u8; 32] = rand::random();
    blake3::hash(&random_bytes).to_hex().to_string()
}

pub fn generate_salt() -> String {
    random_hex()
}

/// One per login, stored as the `sessions.id` row and mirrored into the
/// signed admin cookie. Unguessable (32 random bytes, blake3-hashed) the
/// same way the daily salt is — there's no reason for this one to use a
/// different generator.
pub fn generate_session_id() -> String {
    random_hex()
}
