use sqlx::PgPool;

const MAX_ATTEMPTS: i32 = 5;
const WINDOW_SECS: f64 = 5.0 * 60.0;

/// Records one login attempt for `ip` and reports whether it is still allowed.
pub async fn allow(pool: &PgPool, ip: &str) -> Result<bool, sqlx::Error> {
    let (attempts,): (i32,) = sqlx::query_as(
        r#"
        INSERT INTO login_attempts (ip, attempts, window_started_at)
        VALUES ($1, 1, now())
        ON CONFLICT (ip) DO UPDATE
        SET attempts = CASE
                WHEN login_attempts.window_started_at + make_interval(secs => $2) <= now() THEN 1
                ELSE login_attempts.attempts + 1
            END,
            window_started_at = CASE
                WHEN login_attempts.window_started_at + make_interval(secs => $2) <= now() THEN now()
                ELSE login_attempts.window_started_at
            END
        RETURNING attempts
        "#,
    )
    .bind(ip)
    .bind(WINDOW_SECS)
    .fetch_one(pool)
    .await?;

    Ok(attempts <= MAX_ATTEMPTS)
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn fresh() -> (PgPool, String) {
        let admin_url = std::env::var("TEST_DATABASE_URL").expect("TEST_DATABASE_URL");
        let admin = PgPool::connect(&admin_url).await.unwrap();
        let name = format!(
            "lim{}{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .subsec_nanos()
        );
        sqlx::query(sqlx::AssertSqlSafe(format!("CREATE DATABASE {name}")))
            .execute(&admin)
            .await
            .unwrap();
        let (base, _) = admin_url.rsplit_once('/').unwrap();
        let url = format!("{base}/{name}");
        let pool = PgPool::connect(&url).await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        (pool, url)
    }

    #[tokio::test]
    async fn a_fresh_pool_keeps_the_login_limit() {
        let (first, url) = fresh().await;
        let ip = "203.0.113.40";

        for _ in 0..5 {
            assert!(allow(&first, ip).await.unwrap());
        }
        first.close().await;

        let second = PgPool::connect(&url).await.unwrap();
        assert!(
            !allow(&second, ip).await.unwrap(),
            "a new pool must still see the five attempts"
        );
        assert!(allow(&second, "203.0.113.41").await.unwrap());

        sqlx::query("UPDATE login_attempts SET window_started_at = now() - interval '6 minutes' WHERE ip = $1")
            .bind(ip)
            .execute(&second)
            .await
            .unwrap();
        assert!(
            allow(&second, ip).await.unwrap(),
            "a new window starts clean"
        );
    }
}
