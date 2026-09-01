use axum::Json;
use axum::extract::State;
use axum::extract::rejection::JsonRejection;
use axum::http::{HeaderMap, StatusCode};

use crate::error::AppError;
use crate::extractors::visitor::{Visitor, client_ip};
use crate::models::event::NewEventBody;
use crate::state::AppState;

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    visitor: Visitor,
    body: Result<Json<NewEventBody>, JsonRejection>,
) -> Result<StatusCode, AppError> {
    if visitor.is_bot {
        // Drains the body even for a dropped event, so the client doesn't
        // see a connection-reset instead of the 204 it expects.
        let _ = body;
        return Ok(StatusCode::NO_CONTENT);
    }

    if !state.event_limiter.check(client_ip(&headers)) {
        return Err(AppError::TooManyRequests);
    }

    let Json(body) = body?;

    sqlx::query!(
        r#"
        INSERT INTO events (kind, path, target, referrer, country, device, visitor_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        body.kind.as_str(),
        body.path,
        body.target,
        visitor.referrer,
        visitor.country,
        visitor.device,
        visitor.visitor_hash,
    )
    .execute(&state.pool)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
