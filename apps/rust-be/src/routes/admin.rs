use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum_extra::extract::cookie::SignedCookieJar;
use serde::Deserialize;

use crate::auth;
use crate::error::AppError;
use crate::extractors::admin::Admin;
use crate::extractors::same_origin::{SameOrigin, origin_allowed};
use crate::extractors::visitor::client_ip;
use crate::login_limit;
use crate::models::post::{AdminPost, AdminPostDetail, AdminRow, NewPost, PostRow, UpdatePost};
use crate::revalidate;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub(super) struct LoginRequest {
    password: String,
}

fn json_content_type(headers: &HeaderMap) -> bool {
    headers
        .get(axum::http::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .is_some_and(|mime| mime.trim().eq_ignore_ascii_case("application/json"))
}

/// Rendered here, once, at write time — instead of on every future
/// GET /posts/:slug. Shared by create and update so the two write paths
/// can't drift on how native HTML gets derived.
fn render_native_html(markdown: Option<&str>) -> Option<String> {
    markdown.map(crate::markdown::render)
}

pub(super) async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    jar: SignedCookieJar,
    body: Result<Json<LoginRequest>, JsonRejection>,
) -> Result<(SignedCookieJar, StatusCode), AppError> {
    // A cross-site form POST is a simple request: the browser sends it with
    // no preflight.
    if !origin_allowed(&headers, &state.config.allowed_origin) {
        return Err(AppError::Forbidden);
    }
    if !json_content_type(&headers) {
        return Err(AppError::UnsupportedMediaType);
    }

    // Checked before touching the password at all, so a rate-limited caller
    // doesn't also cost us an argon2 hash (the operation this endpoint
    // exists to make expensive in the first place).
    if !login_limit::allow(&state.pool, client_ip(&headers)).await? {
        return Err(AppError::TooManyRequests);
    }

    let Json(payload) = body?;

    if !auth::verify_password(&state.config.admin_password_hash, &payload.password)? {
        return Err(AppError::Unauthorized);
    }

    let epoch = state.session_epoch().await?;
    let jar = jar.add(auth::session_cookie(epoch, &state.config.cookie_domain));

    Ok((jar, StatusCode::OK))
}

pub(super) async fn logout(
    State(state): State<AppState>,
    // Before `Admin`: a cross-site request is refused without touching the
    // session at all.
    _same_origin: SameOrigin,
    _admin: Admin,
    jar: SignedCookieJar,
) -> Result<(SignedCookieJar, StatusCode), AppError> {
    sqlx::query!(
        "UPDATE session_epoch SET epoch = epoch + 1 WHERE singleton = true RETURNING epoch"
    )
    .fetch_one(&state.pool)
    .await?;

    let jar = jar.remove(auth::logout_cookie(&state.config.cookie_domain));
    Ok((jar, StatusCode::OK))
}

pub(super) async fn list(
    State(state): State<AppState>,
    _admin: Admin,
) -> Result<Json<Vec<AdminPost>>, AppError> {
    // No html: the list response drops it (see `AdminPostDetail`), so
    // fetching it only moved a rendered blob per row across the connection.
    let rows = sqlx::query_as!(
        AdminRow,
        r#"
        SELECT id, slug, title, description, category, source, url, markdown, status,
               published_at, created_at, updated_at
        FROM posts
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    let posts = rows
        .into_iter()
        .map(|row| {
            row.into_admin()
                .map_err(|err| AppError::Internal(format!("malformed post row: {}", err.slug)))
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(Json(posts))
}

pub(super) async fn get(
    State(state): State<AppState>,
    _admin: Admin,
    Path(id): Path<i64>,
) -> Result<Json<AdminPostDetail>, AppError> {
    let row = sqlx::query_as!(
        PostRow,
        r#"
        SELECT id, slug, title, description, category, source, url, markdown, html, status,
               published_at, created_at, updated_at
        FROM posts
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let post = row
        .into_admin_detail()
        .map_err(|err| AppError::Internal(format!("malformed post row: {}", err.slug)))?;

    Ok(Json(post))
}

pub(super) async fn create(
    State(state): State<AppState>,
    _admin: Admin,
    body: Result<Json<NewPost>, JsonRejection>,
) -> Result<(StatusCode, Json<AdminPost>), AppError> {
    let Json(new_post) = body?;
    new_post
        .validate()
        .map_err(|message| AppError::BadRequest(message.to_owned()))?;
    let status = new_post.status.as_str();
    let (source, url, markdown) = new_post.source.into_parts();
    let html = render_native_html(markdown.as_deref());

    let row = sqlx::query_as!(
        PostRow,
        r#"
        INSERT INTO posts (slug, title, description, category, source, url, markdown, html, status, published_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $9 = 'published' THEN now() ELSE NULL END)
        RETURNING id, slug, title, description, category, source, url, markdown, html, status,
                  published_at, created_at, updated_at
        "#,
        new_post.slug,
        new_post.title,
        new_post.description,
        new_post.category,
        source,
        url,
        markdown,
        html,
        status,
    )
    .fetch_one(&state.pool)
    .await;

    let row = match row {
        Ok(row) => row,
        Err(sqlx::Error::Database(db_err)) if db_err.code().as_deref() == Some("23505") => {
            return Err(AppError::Conflict("slug already exists".to_owned()));
        }
        Err(err) => return Err(err.into()),
    };

    let post = row
        .into_admin()
        .map_err(|err| AppError::Internal(format!("malformed post row: {}", err.slug)))?;

    revalidate::trigger(&state.config).await;

    Ok((StatusCode::CREATED, Json(post)))
}

pub(super) async fn update(
    State(state): State<AppState>,
    _admin: Admin,
    Path(id): Path<i64>,
    body: Result<Json<UpdatePost>, JsonRejection>,
) -> Result<Json<AdminPost>, AppError> {
    let Json(update) = body?;
    update
        .validate()
        .map_err(|message| AppError::BadRequest(message.to_owned()))?;
    let status = update.status.as_str();
    let (source, url, markdown) = update.source.into_parts();
    let html = render_native_html(markdown.as_deref());

    let row = sqlx::query_as!(
        PostRow,
        r#"
        UPDATE posts SET
            title = $1,
            description = $2,
            category = $3,
            source = $4,
            url = $5,
            markdown = $6,
            html = $7,
            status = $8,
            published_at = CASE
                WHEN $8 = 'published' AND published_at IS NULL THEN now()
                ELSE published_at
            END,
            updated_at = now()
        WHERE id = $9
        RETURNING id, slug, title, description, category, source, url, markdown, html, status,
                  published_at, created_at, updated_at
        "#,
        update.title,
        update.description,
        update.category,
        source,
        url,
        markdown,
        html,
        status,
        id,
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let post = row
        .into_admin()
        .map_err(|err| AppError::Internal(format!("malformed post row: {}", err.slug)))?;

    revalidate::trigger(&state.config).await;

    Ok(Json(post))
}

pub(super) async fn delete(
    State(state): State<AppState>,
    _admin: Admin,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query!("DELETE FROM posts WHERE id = $1", id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    revalidate::trigger(&state.config).await;

    Ok(StatusCode::NO_CONTENT)
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::time::Duration;

    use argon2::Argon2;
    use argon2::password_hash::{PasswordHasher, SaltString};
    use axum::Json;
    use axum::extract::State;
    use axum::http::{HeaderMap, StatusCode, header};
    use axum_extra::extract::cookie::{Key, SignedCookieJar};
    use sqlx::PgPool;

    use super::{LoginRequest, login};
    use crate::config::Config;
    use crate::error::AppError;
    use crate::ratelimit::RateLimiter;
    use crate::state::AppState;

    fn password_hash(password: &str) -> String {
        let salt = SaltString::encode_b64(b"0123456789abcdef").unwrap();
        Argon2::default()
            .hash_password(password.as_bytes(), &salt)
            .unwrap()
            .to_string()
    }

    async fn fresh_pool() -> PgPool {
        let admin_url = std::env::var("TEST_DATABASE_URL").expect("TEST_DATABASE_URL");
        let admin = PgPool::connect(&admin_url).await.unwrap();
        let name = format!(
            "login{}{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .subsec_nanos()
        );
        sqlx::query(sqlx::AssertSqlSafe(format!("CREATE DATABASE {name}")))
            .execute(&admin)
            .await
            .unwrap();
        let (base, _) = admin_url.rsplit_once('/').unwrap();
        let pool = PgPool::connect(&format!("{base}/{name}")).await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    fn state(pool: PgPool, admin_password_hash: String) -> AppState {
        AppState {
            pool,
            config: Config {
                database_url: String::new(),
                admin_password_hash,
                cookie_key: "cookie-key-cookie-key-cookie-key-cookie-key-cookie".into(),
                revalidate_url: "http://127.0.0.1/api/revalidate".into(),
                revalidate_secret: "secret".into(),
                allowed_origin: "https://www.shauryacodes.me".into(),
                cookie_domain: String::new(),
                visitor_hash_secret: "visitor-secret".into(),
            },
            event_limiter: Arc::new(RateLimiter::new(120, Duration::from_secs(60))),
        }
    }

    fn headers(origin: &str, content_type: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(header::ORIGIN, origin.parse().unwrap());
        headers.insert(header::CONTENT_TYPE, content_type.parse().unwrap());
        headers.insert("x-vercel-forwarded-for", "203.0.113.77".parse().unwrap());
        headers.insert("fly-client-ip", "198.51.100.9".parse().unwrap());
        headers
    }

    fn jar(state: &AppState) -> SignedCookieJar {
        SignedCookieJar::new(Key::derive_from(state.config.cookie_key.as_bytes()))
    }

    #[tokio::test]
    async fn foreign_origin_and_text_plain_do_not_burn_an_attempt() {
        let pool = fresh_pool().await;
        let password = "correct-horse";
        let app = state(pool, password_hash(password));
        let body = || {
            Ok(Json(LoginRequest {
                password: password.into(),
            }))
        };

        for _ in 0..5 {
            let err = login(
                State(app.clone()),
                headers("https://evil.example", "application/json"),
                jar(&app),
                body(),
            )
            .await
            .unwrap_err();
            assert!(matches!(err, AppError::Forbidden));
        }

        for _ in 0..5 {
            let err = login(
                State(app.clone()),
                headers("https://www.shauryacodes.me", "text/plain"),
                jar(&app),
                body(),
            )
            .await
            .unwrap_err();
            assert!(matches!(err, AppError::UnsupportedMediaType));
        }

        let counted: i64 = sqlx::query_scalar("SELECT count(*) FROM login_attempts WHERE ip = $1")
            .bind("203.0.113.77")
            .fetch_one(&app.pool)
            .await
            .unwrap();
        assert_eq!(counted, 0, "rejected requests must not consume an attempt");

        let (_cookie, status) = login(
            State(app.clone()),
            headers("https://www.shauryacodes.me", "application/json"),
            jar(&app),
            body(),
        )
        .await
        .unwrap();
        assert_eq!(status, StatusCode::OK);

        let attempts: i32 = sqlx::query_scalar("SELECT attempts FROM login_attempts WHERE ip = $1")
            .bind("203.0.113.77")
            .fetch_one(&app.pool)
            .await
            .unwrap();
        assert_eq!(attempts, 1);

        let spoofed: i64 = sqlx::query_scalar("SELECT count(*) FROM login_attempts WHERE ip = $1")
            .bind("198.51.100.9")
            .fetch_one(&app.pool)
            .await
            .unwrap();
        assert_eq!(spoofed, 0, "fly-client-ip must not be the rate-limit key");
    }
}
