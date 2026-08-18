mod config;
mod db;
mod error;
mod extractors;
mod markdown;
mod models;
mod routes;
mod state;

use std::sync::Arc;

use tokio::sync::RwLock;

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

    let state = AppState { pool, daily_salt };

    let app = routes::router().with_state(state);

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
