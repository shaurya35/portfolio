use axum::Router;
use axum::routing::{get, patch, post};

mod admin;
mod events;
mod health;
mod posts;
mod stats;

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health))
        .route("/posts", get(posts::list))
        .route("/posts/{slug}", get(posts::get))
        .route("/admin/login", post(admin::login))
        .route("/admin/logout", post(admin::logout))
        .route("/admin/posts", get(admin::list).post(admin::create))
        .route(
            "/admin/posts/{id}",
            patch(admin::update).delete(admin::delete),
        )
        .route("/admin/stats", get(stats::stats))
        .route("/e", post(events::create))
}
