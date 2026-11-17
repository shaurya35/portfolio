use std::sync::Arc;

use sqlx::PgPool;

use crate::config::Config;
use crate::ratelimit::RateLimiter;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Config,
    pub event_limiter: Arc<RateLimiter>,
}

impl AppState {
    pub async fn session_epoch(&self) -> Result<u64, sqlx::Error> {
        let row = sqlx::query!("SELECT epoch FROM session_epoch WHERE singleton = true")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.epoch as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_state(pool: PgPool) -> AppState {
        AppState {
            pool,
            config: Config {
                database_url: String::new(),
                admin_password_hash: String::new(),
                cookie_key: "k".repeat(64),
                revalidate_url: String::new(),
                revalidate_secret: String::new(),
                allowed_origin: "https://www.shauryacodes.me".into(),
                cookie_domain: String::new(),
                visitor_hash_secret: "visitor-secret".into(),
            },
            event_limiter: Arc::new(RateLimiter::new(120, std::time::Duration::from_secs(60))),
        }
    }

    #[tokio::test]
    async fn a_logout_on_one_instance_rejects_the_old_cookie_on_another() {
        let url = std::env::var("TEST_DATABASE_URL").expect("TEST_DATABASE_URL");
        let pool = sqlx::PgPool::connect(&url).await.unwrap();
        sqlx::query("UPDATE session_epoch SET epoch = 4 WHERE singleton = true")
            .execute(&pool)
            .await
            .unwrap();

        let writer = test_state(pool.clone());
        let reader = test_state(pool);
        assert_eq!(reader.session_epoch().await.unwrap(), 4);

        sqlx::query("UPDATE session_epoch SET epoch = epoch + 1 WHERE singleton = true")
            .execute(&writer.pool)
            .await
            .unwrap();

        let seen = reader.session_epoch().await.unwrap();
        assert_eq!(seen, 5, "the other instance must see the logout");
        assert_ne!(4, seen, "the pre-logout cookie must no longer match");
    }
}
