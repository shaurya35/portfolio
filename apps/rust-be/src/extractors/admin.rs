use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum_extra::extract::cookie::{Key, SignedCookieJar};

use crate::auth::ADMIN_COOKIE;
use crate::error::AppError;
use crate::state::AppState;

pub struct Admin {
    /// Only `logout` reads this (to know which row to revoke) — every other
    /// handler takes `_admin: Admin` and ignores it.
    pub session_id: String,
}

impl FromRequestParts<AppState> for Admin {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let jar = match SignedCookieJar::<Key>::from_request_parts(parts, state).await {
            Ok(jar) => jar,
            Err(infallible) => match infallible {},
        };

        let session_id = jar
            .get(ADMIN_COOKIE)
            .map(|cookie| cookie.value().to_owned())
            .ok_or(AppError::Unauthorized)?;

        // A DB read per admin request — the cost of per-session revocation
        // instead of the old free in-memory epoch compare. Accepted
        // deliberately: admin traffic is low (single operator), and there's
        // no correct way to invalidate one session without the ability to
        // check for exactly one session.
        let row = sqlx::query!("SELECT revoked_at FROM sessions WHERE id = $1", session_id)
            .fetch_optional(&state.pool)
            .await?;

        match row {
            Some(row) if row.revoked_at.is_none() => Ok(Admin { session_id }),
            _ => Err(AppError::Unauthorized),
        }
    }
}
