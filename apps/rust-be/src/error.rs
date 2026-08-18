use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("not found")]
    NotFound,

    #[error("internal error: {0}")]
    Internal(String),

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl From<JsonRejection> for AppError {
    fn from(rejection: JsonRejection) -> Self {
        AppError::BadRequest(rejection.body_text())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        if matches!(self, AppError::Database(_) | AppError::Internal(_)) {
            tracing::error!("{self}");
        }

        let (status, error) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::NotFound => (StatusCode::NOT_FOUND, "not found".to_owned()),
            AppError::Internal(_) | AppError::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal server error".to_owned(),
            ),
        };

        (status, Json(ErrorBody { error })).into_response()
    }
}
