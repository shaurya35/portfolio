mod auth;
mod config;
mod db;
mod error;
mod extractors;
mod markdown;
mod models;
mod ratelimit;
mod revalidate;
mod routes;
mod state;

use std::sync::Arc;
use std::time::Duration;

use axum::http::{HeaderValue, Method, header};
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

use crate::config::Config;
use crate::ratelimit::RateLimiter;
use crate::state::AppState;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    dotenvy::dotenv().ok();

    let config = Config::from_env().unwrap_or_else(|err| {
        eprintln!("configuration error: {err}");
        std::process::exit(1);
    });

    let pool = db::connect(&config.database_url)
        .await
        .unwrap_or_else(|err| {
            eprintln!("database connection failed: {err}");
            std::process::exit(1);
        });

    sqlx::migrate!().run(&pool).await.unwrap_or_else(|err| {
        eprintln!("migration failed: {err}");
        std::process::exit(1);
    });

    // Non-fatal: this is a caching optimization, not a correctness
    // requirement — `into_detail` (models/post.rs) already falls back to
    // rendering on the fly for any row this doesn't reach. Exiting the
    // whole process over it would take every route down (auth, x/medium
    // posts, admin CRUD) for what's at most a transient slow read.
    if let Err(err) = backfill_post_html(&pool).await {
        tracing::error!("post html backfill failed, continuing without it: {err}");
    }

    let session_epoch = load_session_epoch(&pool).await.unwrap_or_else(|err| {
        eprintln!("session epoch load failed: {err}");
        std::process::exit(1);
    });

    let daily_salt = Arc::new(RwLock::new(state::generate_salt()));

    tokio::spawn({
        let daily_salt = daily_salt.clone();
        async move {
            loop {
                tokio::time::sleep(state::SALT_ROTATION_INTERVAL).await;
                *daily_salt.write().await = state::generate_salt();
            }
        }
    });

    let allowed_origin = HeaderValue::from_str(&config.allowed_origin).unwrap_or_else(|err| {
        eprintln!("invalid ALLOWED_ORIGIN: {err}");
        std::process::exit(1);
    });

    let state = AppState {
        pool,
        config,
        daily_salt,
        session_epoch: Arc::new(RwLock::new(session_epoch)),
        login_limiter: Arc::new(RateLimiter::new(5, Duration::from_secs(5 * 60))),
        event_limiter: Arc::new(RateLimiter::new(120, Duration::from_secs(60))),
    };

    let cors = CorsLayer::new()
        .allow_origin(allowed_origin)
        .allow_credentials(true)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE]);

    let app = routes::router().with_state(state).layer(cors);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|err| {
            eprintln!("failed to bind: {err}");
            std::process::exit(1);
        });

    println!("Server running on http://localhost:{port}");

    axum::serve(listener, app).await.unwrap_or_else(|err| {
        eprintln!("server error: {err}");
        std::process::exit(1);
    });
}

/// Loads the persisted session epoch (see `session_epoch.rs` migration) so
/// logout invalidation survives a restart. `state::session_epoch` still
/// holds the live value in memory afterwards — every admin request checks
/// against that in-memory copy, not the database, so this pays one query
/// at boot rather than a DB round trip per request.
async fn load_session_epoch(pool: &sqlx::PgPool) -> Result<u64, sqlx::Error> {
    let row = sqlx::query!("SELECT epoch FROM session_epoch WHERE singleton = true")
        .fetch_one(pool)
        .await?;

    Ok(row.epoch as u64)
}

/// One-time backfill for the `html` column added after native posts already
/// existed. Runs the `WHERE html IS NULL` query on every boot, but that's a
/// cheap no-op once every native row has been rendered — cold-start cost
/// this pays once, not the per-request cost it replaces.
async fn backfill_post_html(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    let rows =
        sqlx::query!(r#"SELECT id, markdown FROM posts WHERE source = 'native' AND html IS NULL"#)
            .fetch_all(pool)
            .await?;

    for row in rows {
        let Some(markdown) = row.markdown else {
            continue;
        };
        let html = markdown::render(&markdown);
        sqlx::query!("UPDATE posts SET html = $1 WHERE id = $2", html, row.id)
            .execute(pool)
            .await?;
    }

    Ok(())
}
