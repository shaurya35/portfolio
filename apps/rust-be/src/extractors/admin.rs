use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum_extra::extract::cookie::{Key, SignedCookieJar};

use crate::auth::ADMIN_COOKIE;
use crate::error::AppError;
use crate::state::AppState;

pub struct Admin;

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

        jar.get(ADMIN_COOKIE)
            .map(|_| Admin)
            .ok_or(AppError::Unauthorized)
    }
}
