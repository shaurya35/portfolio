mod auth;
mod config;
mod db;
mod error;
mod extractors;
mod markdown;
mod models;
mod revalidate;
mod routes;
mod state;

use std::sync::Arc;

use axum::http::{HeaderValue, Method, header};
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

use crate::config::Config;
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
        session_epoch: Arc::new(RwLock::new(0)),
    };

    let cors = CorsLayer::new()
        .allow_origin(allowed_origin)
        .allow_credentials(true)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE]);

    let app = routes::router().with_state(state).layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .unwrap_or_else(|err| {
            eprintln!("failed to bind: {err}");
            std::process::exit(1);
        });

    println!("Server running on http://localhost:8080");

    axum::serve(listener, app).await.unwrap_or_else(|err| {
        eprintln!("server error: {err}");
        std::process::exit(1);
    });
}
