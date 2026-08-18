use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::extract::FromRef;
use axum_extra::extract::cookie::{Cookie, Key, SameSite};
use time::Duration;

use crate::error::AppError;
use crate::state::AppState;

pub const ADMIN_COOKIE: &str = "admin_session";

pub fn verify_password(hash: &str, password: &str) -> Result<bool, AppError> {
    let parsed = PasswordHash::new(hash)
        .map_err(|_| AppError::Internal("invalid password hash configuration".to_owned()))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

pub fn session_cookie(epoch: u64) -> Cookie<'static> {
    Cookie::build((ADMIN_COOKIE, epoch.to_string()))
        .domain(".shauryacodes.me")
        .path("/")
        .same_site(SameSite::Lax)
        .secure(true)
        .http_only(true)
        .max_age(Duration::days(14))
        .build()
}

pub fn logout_cookie() -> Cookie<'static> {
    Cookie::build((ADMIN_COOKIE, ""))
        .domain(".shauryacodes.me")
        .path("/")
        .same_site(SameSite::Lax)
        .secure(true)
        .http_only(true)
        .max_age(Duration::ZERO)
        .build()
}

impl FromRef<AppState> for Key {
    fn from_ref(state: &AppState) -> Self {
        Key::derive_from(state.config.cookie_key.as_bytes())
    }
}
