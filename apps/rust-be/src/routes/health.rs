use axum::Json;
use axum::extract::State;
use serde::Serialize;

use crate::error::AppError;
use crate::state::AppState;

#[derive(Serialize)]
pub(super) struct Health {
    status: &'static str,
    version: &'static str,
}

pub(super) async fn health(State(state): State<AppState>) -> Result<Json<Health>, AppError> {
    sqlx::query("SELECT 1").execute(&state.pool).await?;

    Ok(Json(Health {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
    }))
}
