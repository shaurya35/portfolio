use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};

use crate::error::AppError;
use crate::extractors::visitor::{Visitor, client_ip};
use crate::models::event::NewEventBody;
use crate::state::AppState;

/// The longest a DNS hostname can be.
const MAX_REFERRER_LEN: usize = 253;

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    visitor: Visitor,
    // Raw bytes rather than `Json`, which insists on a JSON Content-Type:
    // the site's beacons send `text/plain` on purpose. A JSON Content-Type
    // isn't CORS-safelisted, so the browser sent an OPTIONS preflight ahead
    // of every pageview and click — two function invocations (each a
    // possible cold start) per event instead of one.
    body: Bytes,
) -> Result<StatusCode, AppError> {
    if visitor.is_bot {
        return Ok(StatusCode::NO_CONTENT);
    }

    if !state.event_limiter.check(client_ip(&headers)) {
        return Err(AppError::TooManyRequests);
    }

    let body: NewEventBody = serde_json::from_slice(&body)
        .map_err(|err| AppError::BadRequest(format!("invalid event body: {err}")))?;

    // A hostname is all the stats page shows; anything else (empty, or
    // something far too long to be one) is dropped rather than stored.
    let referrer = body
        .referrer
        .as_deref()
        .map(str::trim)
        .filter(|host| !host.is_empty() && host.len() <= MAX_REFERRER_LEN);

    sqlx::query!(
        r#"
        INSERT INTO events (kind, path, target, referrer, country, device, visitor_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        body.kind.as_str(),
        body.path,
        body.target,
        referrer,
        visitor.country,
        visitor.device,
        visitor.visitor_hash,
    )
    .execute(&state.pool)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
