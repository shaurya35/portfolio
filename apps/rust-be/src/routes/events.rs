use axum::Json;
use axum::extract::State;
use axum::extract::rejection::JsonRejection;
use axum::http::StatusCode;

use crate::error::AppError;
use crate::extractors::visitor::Visitor;
use crate::models::event::NewEventBody;
use crate::state::AppState;

pub async fn create(
    State(state): State<AppState>,
    visitor: Visitor,
    body: Result<Json<NewEventBody>, JsonRejection>,
) -> Result<StatusCode, AppError> {
    let Json(body) = body?;

    if visitor.is_bot {
        return Ok(StatusCode::NO_CONTENT);
    }

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
