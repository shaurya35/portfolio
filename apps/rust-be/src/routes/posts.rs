use axum::Json;
use axum::extract::{Path, State};

use crate::error::AppError;
use crate::models::post::{Post, PostRow, PostSummary};
use crate::state::AppState;

pub async fn list(State(state): State<AppState>) -> Result<Json<Vec<PostSummary>>, AppError> {
    let rows = sqlx::query_as!(
        PostRow,
        r#"
        SELECT id, slug, title, description, category, source, url, markdown, html, status,
               published_at, created_at, updated_at
        FROM posts
        WHERE status = 'published'
        ORDER BY published_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    let posts = rows
        .into_iter()
        .map(|row| {
            row.into_summary()
                .map_err(|err| AppError::Internal(format!("malformed post row: {}", err.slug)))
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(Json(posts))
}

pub async fn get(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<Post>, AppError> {
    let row = sqlx::query_as!(
        PostRow,
        r#"
        SELECT id, slug, title, description, category, source, url, markdown, html, status,
               published_at, created_at, updated_at
        FROM posts
        WHERE status = 'published' AND slug = $1
        "#,
        slug
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let post = row
        .into_detail()
        .map_err(|err| AppError::Internal(format!("malformed post row: {}", err.slug)))?;

    Ok(Json(post))
}
