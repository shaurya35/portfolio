use axum::extract::FromRequestParts;
use axum::http::header::ORIGIN;
use axum::http::request::Parts;

use crate::error::AppError;
use crate::state::AppState;

/// Rejects a request a browser sent on behalf of another site.
///
/// The admin cookie is `SameSite=None` (the admin UI and this API live on
/// different sites), so a browser attaches it to requests any page makes.
/// CORS stops another site reading the response, but not a "simple"
/// request from being sent and acted on: a bodyless POST to
/// /admin/logout from any page the admin had open logged them out
/// everywhere. The JSON routes are covered by their preflight; this is for
/// the ones a plain cross-site POST can reach.
///
/// Browsers always send `Origin` on a cross-origin POST, so a missing
/// header means a non-browser client, which never carries the admin's
/// cookie by accident.
pub struct SameOrigin;

impl FromRequestParts<AppState> for SameOrigin {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        match parts.headers.get(ORIGIN) {
            Some(origin) if origin.as_bytes() != state.config.allowed_origin.as_bytes() => {
                Err(AppError::Forbidden)
            }
            _ => Ok(SameOrigin),
        }
    }
}
