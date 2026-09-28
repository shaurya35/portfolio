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

    // Nothing between here and `TcpListener::bind` touches the network.
    // Migrations moved to the deploy step (see the `migrate` job in
    // .github/workflows/ci.yml) and the session epoch loads on first admin
    // request, because on Vercel every one of those round trips was paid
    // again on every cold start — and the measured cost was ~1.9s of billed
    // Active CPU per invocation against a database a hemisphere away.
    let pool = db::connect(&config.database_url).unwrap_or_else(|err| {
        eprintln!("invalid DATABASE_URL: {err}");
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
        cached_session_epoch: Arc::new(RwLock::new(None)),
        login_limiter: Arc::new(RateLimiter::new(5, Duration::from_secs(5 * 60))),
        event_limiter: Arc::new(RateLimiter::new(120, Duration::from_secs(60))),
    };

    let cors = CorsLayer::new()
        .allow_origin(allowed_origin)
        .allow_credentials(true)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE])
        // Without this a browser re-sends the OPTIONS preflight for every
        // admin write after ~5s, and each one is a function invocation
        // (often a cold start). Browsers cap it anyway (Chrome at 2 hours).
        .max_age(Duration::from_secs(2 * 60 * 60));

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
