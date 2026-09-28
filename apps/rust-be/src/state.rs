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
    ///
    /// `None` until something asks for it: read it through
    /// [`AppState::session_epoch`], never directly.
    pub cached_session_epoch: Arc<RwLock<Option<u64>>>,
    /// Keyed by client IP. 5 attempts / 5 minutes — tight, since a real
    /// admin mistyping a password a handful of times is the only legitimate
    /// case this could ever block.
    pub login_limiter: Arc<RateLimiter>,
    /// Keyed by client IP. 120 events / minute — generous, sized for a
    /// real visitor browsing quickly, not for scripted spam.
    pub event_limiter: Arc<RateLimiter>,
}

impl AppState {
    /// The persisted session epoch (see the `persist_session_epoch`
    /// migration), read from the database on first use rather than at boot.
    ///
    /// Only three paths ever need it — login, logout, and the `Admin`
    /// extractor — and none of them is public traffic. Loading it eagerly
    /// meant every cold start paid a cross-region round trip before the
    /// server could bind, on behalf of a request that in practice was
    /// almost always an anonymous `GET /posts`.
    pub async fn session_epoch(&self) -> Result<u64, sqlx::Error> {
        if let Some(epoch) = *self.cached_session_epoch.read().await {
            return Ok(epoch);
        }

        self.reload_session_epoch().await
    }

    /// Reads the epoch from the database even when this instance has one
    /// cached, and caches what it read.
    ///
    /// The cache is per instance and only the instance that handles a
    /// logout updates its own copy, so another instance still warm from
    /// before that logout keeps the old epoch. Login used to trust that
    /// copy: signing back in through a stale instance issued a cookie with
    /// the pre-logout epoch, which the up-to-date instances then rejected —
    /// "session expired" moments after a successful sign-in. Login and a
    /// cookie that doesn't match the cache (both rare) come through here.
    pub async fn reload_session_epoch(&self) -> Result<u64, sqlx::Error> {
        let row = sqlx::query!("SELECT epoch FROM session_epoch WHERE singleton = true")
            .fetch_one(&self.pool)
            .await?;
        let epoch = row.epoch as u64;

        // Two concurrent reloads read the same singleton row, so whichever
        // lands second writes the same value.
        *self.cached_session_epoch.write().await = Some(epoch);

        Ok(epoch)
    }
}

pub fn generate_salt() -> String {
    let random_bytes: [u8; 32] = rand::random();
    blake3::hash(&random_bytes).to_hex().to_string()
}
