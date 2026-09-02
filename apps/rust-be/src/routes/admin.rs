use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum_extra::extract::cookie::SignedCookieJar;
use serde::Deserialize;

use crate::auth;
use crate::error::AppError;
use crate::extractors::admin::Admin;
use crate::extractors::visitor::client_ip;
use crate::models::post::{AdminPost, AdminPostDetail, NewPost, PostRow, UpdatePost};
use crate::revalidate;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub(super) struct LoginRequest {
    password: String,
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
    // Checked before touching the password at all, so a rate-limited caller
    // doesn't also cost us an argon2 hash (the operation this endpoint
    // exists to make expensive in the first place).
    if !state.login_limiter.check(client_ip(&headers)) {
        return Err(AppError::TooManyRequests);
    }

    let Json(payload) = body?;

    if !auth::verify_password(&state.config.admin_password_hash, &payload.password)? {
        return Err(AppError::Unauthorized);
    }

    let epoch = *state.session_epoch.read().await;
    let jar = jar.add(auth::session_cookie(epoch, &state.config.cookie_domain));

    Ok((jar, StatusCode::OK))
}

pub(super) async fn logout(
    State(state): State<AppState>,
    _admin: Admin,
    jar: SignedCookieJar,
) -> Result<(SignedCookieJar, StatusCode), AppError> {
    // Persisted first so the invalidation survives a restart (see the
    // session_epoch migration); the in-memory copy is set from what the
    // database actually returned rather than a local `+= 1`, so a crash
    // between the two can't leave them disagreeing.
    let row = sqlx::query!(
        "UPDATE session_epoch SET epoch = epoch + 1 WHERE singleton = true RETURNING epoch"
    )
    .fetch_one(&state.pool)
    .await?;
    *state.session_epoch.write().await = row.epoch as u64;

    let jar = jar.remove(auth::logout_cookie(&state.config.cookie_domain));
    Ok((jar, StatusCode::OK))
}

pub(super) async fn list(
    State(state): State<AppState>,
    _admin: Admin,
) -> Result<Json<Vec<AdminPost>>, AppError> {
    let rows = sqlx::query_as!(
        PostRow,
        r#"
        SELECT id, slug, title, description, category, source, url, markdown, html, status,
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
