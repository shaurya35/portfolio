mod config;
mod db;
mod error;
mod extractors;
mod markdown;
mod models;
mod routes;
mod state;

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

    let state = AppState { pool };

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
