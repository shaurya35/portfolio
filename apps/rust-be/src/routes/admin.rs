use axum::Json;
use axum::extract::rejection::{JsonRejection, QueryRejection};
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum_extra::extract::cookie::SignedCookieJar;
use serde::{Deserialize, Serialize};
use sqlx::{Postgres, QueryBuilder};

use crate::auth;
use crate::error::AppError;
use crate::extractors::admin::Admin;
use crate::extractors::visitor::client_ip;
use crate::models::post::{AdminPost, AdminPostList, NewPost, PostRow, UpdatePost};
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

#[derive(Debug, Deserialize)]
pub(super) struct ListQuery {
    q: Option<String>,
    status: Option<String>,
    category: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
}

/// Appends the same WHERE clauses to both the count query and the page
/// query, so the two can never drift on what "matches the filter" means.
fn push_filters(
    qb: &mut QueryBuilder<Postgres>,
    q: Option<String>,
    status: Option<String>,
    category: Option<String>,
) {
    if let Some(q) = q {
        qb.push(" AND title ILIKE ").push_bind(format!("%{q}%"));
    }
    if let Some(status) = status {
        qb.push(" AND status = ").push_bind(status);
    }
    if let Some(category) = category {
        // Substring + case-insensitive, same as the title search — category
        // is free text with no enum/casing enforcement, so this reads as a
        // live filter as the admin types rather than requiring the exact
        // stored spelling.
        qb.push(" AND category ILIKE ")
            .push_bind(format!("%{category}%"));
    }
}

pub(super) async fn list(
    State(state): State<AppState>,
    _admin: Admin,
    query: Result<Query<ListQuery>, QueryRejection>,
) -> Result<Json<AdminPostList>, AppError> {
    let Query(params) = query?;
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = params.offset.unwrap_or(0).max(0);
    let q = params.q.filter(|s| !s.trim().is_empty());
    let status = params.status.filter(|s| !s.trim().is_empty());
    let category = params.category.filter(|s| !s.trim().is_empty());

    let mut count_qb: QueryBuilder<Postgres> =
        QueryBuilder::new("SELECT count(*) FROM posts WHERE true");
    push_filters(&mut count_qb, q.clone(), status.clone(), category.clone());

    let mut list_qb: QueryBuilder<Postgres> = QueryBuilder::new(
        "SELECT id, slug, title, description, category, source, url, markdown, html, status, \
         published_at, created_at, updated_at FROM posts WHERE true",
    );
    push_filters(&mut list_qb, q, status, category);
    list_qb.push(" ORDER BY created_at DESC LIMIT ");
    list_qb.push_bind(limit);
    list_qb.push(" OFFSET ");
    list_qb.push_bind(offset);

    // Two independent queries, sent concurrently instead of one after the
    // other — on a cross-region DB connection (Neon is in ap-southeast-1;
    // this function isn't) each round trip is real latency, and there's no
    // reason the count has to wait for the page to come back first.
    let (total, rows): (i64, Vec<PostRow>) = tokio::try_join!(
        count_qb.build_query_scalar().fetch_one(&state.pool),
        list_qb.build_query_as().fetch_all(&state.pool),
    )?;

    let posts = rows
        .into_iter()
        .map(|row| {
            row.into_admin()
                .map_err(|err| AppError::Internal(format!("malformed post row: {}", err.slug)))
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(Json(AdminPostList { posts, total }))
}

pub(super) async fn get(
    State(state): State<AppState>,
    _admin: Admin,
    Path(id): Path<i64>,
) -> Result<Json<AdminPost>, AppError> {
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
        .into_admin()
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

#[derive(Debug, Deserialize)]
pub(super) struct BulkDeleteRequest {
    ids: Vec<i64>,
}

#[derive(Debug, Serialize)]
pub(super) struct BulkDeleteResponse {
    deleted: i64,
}

pub(super) async fn bulk_delete(
    State(state): State<AppState>,
    _admin: Admin,
    body: Result<Json<BulkDeleteRequest>, JsonRejection>,
) -> Result<Json<BulkDeleteResponse>, AppError> {
    let Json(payload) = body?;

    if payload.ids.is_empty() {
        return Err(AppError::BadRequest("no post ids provided".to_owned()));
    }

    let result = sqlx::query!("DELETE FROM posts WHERE id = ANY($1)", &payload.ids)
        .execute(&state.pool)
        .await?;

    // One trigger for the whole batch, not one per post — the ISR
    // revalidate webhook doesn't need to run N times to pick up N deletions.
    revalidate::trigger(&state.config).await;

    Ok(Json(BulkDeleteResponse {
        deleted: result.rows_affected() as i64,
    }))
}
