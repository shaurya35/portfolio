use axum::Router;
use axum::routing::{get, post};

mod events;
mod health;
mod posts;

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health))
        .route("/posts", get(posts::list))
        .route("/posts/{slug}", get(posts::get))
        .route("/e", post(events::create))
}
