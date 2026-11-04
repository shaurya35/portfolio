//! Fetches of /llms.txt by AI agents, reported by the web app.
//!
//! /e can't record these: it's fed by a script in the page, which an agent
//! reading a text file never runs, and it drops every bot on purpose. So the
//! web app's /llms.txt route posts here itself, server to server, with the
//! secret it already shares with rust-be for the revalidate webhook.

use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};

use crate::error::AppError;
use crate::models::event::NewAgentFetchBody;
use crate::state::AppState;

pub const SECRET_HEADER: &str = "x-internal-secret";

/// A real event is well under 200 bytes.
pub const MAX_BODY_BYTES: usize = 1024;

const MAX_PATH_LEN: usize = 512;
const MAX_AGENT_LEN: usize = 64;
const MAX_COUNTRY_LEN: usize = 8;

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<StatusCode, AppError> {
    let provided = headers
        .get(SECRET_HEADER)
        .and_then(|value| value.to_str().ok());
    if !secret_matches(provided, &state.config.revalidate_secret) {
        return Err(AppError::Unauthorized);
    }

    let body: NewAgentFetchBody = serde_json::from_slice(&body)
        .map_err(|err| AppError::BadRequest(format!("invalid agent event body: {err}")))?;
    let event = validate(body).map_err(|reason| AppError::BadRequest(reason.to_owned()))?;

    // visitor_hash is NOT NULL, but there's no visitor to hash: the request
    // comes from the web server, so its IP and user agent are the site's own.
    sqlx::query!(
        r#"
        INSERT INTO events (kind, path, target, country, visitor_hash)
        VALUES ('agent_fetch', $1, $2, $3, '')
        "#,
        event.path,
        event.agent,
        event.country,
    )
    .execute(&state.pool)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Compares through blake3, whose `Hash` equality is constant time, so the
/// time a wrong guess takes says nothing about how much of it was right. An
/// unset secret never matches, even an empty header.
fn secret_matches(provided: Option<&str>, expected: &str) -> bool {
    match provided {
        Some(provided) if !expected.is_empty() => {
            blake3::hash(provided.as_bytes()) == blake3::hash(expected.as_bytes())
        }
        _ => false,
    }
}

/// The body with every field checked: a path on this site, an agent name
/// short enough to be one, and a country kept only if it looks like a code.
fn validate(mut body: NewAgentFetchBody) -> Result<NewAgentFetchBody, &'static str> {
    if !body.path.starts_with('/') || body.path.len() > MAX_PATH_LEN {
        return Err("invalid path");
    }

    body.agent = body.agent.trim().to_owned();
    let agent_ok = !body.agent.is_empty()
        && body.agent.len() <= MAX_AGENT_LEN
        && body
            .agent
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, ' ' | '-' | '_' | '.'));
    if !agent_ok {
        return Err("invalid agent");
    }

    body.country = body
        .country
        .map(|country| country.trim().to_owned())
        .filter(|country| {
            !country.is_empty()
                && country.len() <= MAX_COUNTRY_LEN
                && country.chars().all(|c| c.is_ascii_alphabetic())
        });

    Ok(body)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(path: &str, agent: &str, country: Option<&str>) -> NewAgentFetchBody {
        NewAgentFetchBody {
            path: path.to_owned(),
            agent: agent.to_owned(),
            country: country.map(str::to_owned),
        }
    }

    #[test]
    fn only_the_exact_secret_matches() {
        assert!(secret_matches(Some("s3cret"), "s3cret"));
        assert!(!secret_matches(Some("s3cret "), "s3cret"));
        assert!(!secret_matches(Some("wrong"), "s3cret"));
        assert!(!secret_matches(None, "s3cret"));
    }

    #[test]
    fn an_unset_secret_never_matches() {
        assert!(!secret_matches(Some(""), ""));
        assert!(!secret_matches(None, ""));
    }

    #[test]
    fn a_normal_event_passes_and_is_tidied() {
        let event = validate(body("/llms.txt", " ClaudeBot ", Some(" IN "))).unwrap();
        assert_eq!(event.agent, "ClaudeBot");
        assert_eq!(event.country.as_deref(), Some("IN"));
    }

    #[test]
    fn agent_names_with_spaces_dots_and_dashes_pass() {
        for agent in [
            "ChatGPT-User",
            "Other bot",
            "Claude-SearchBot",
            "Meta.Agent_1",
        ] {
            assert!(validate(body("/llms.txt", agent, None)).is_ok(), "{agent}");
        }
    }

    #[test]
    fn bad_paths_and_agents_are_rejected() {
        assert_eq!(
            validate(body("llms.txt", "ClaudeBot", None)).unwrap_err(),
            "invalid path"
        );
        assert_eq!(
            validate(body(
                &format!("/{}", "a".repeat(MAX_PATH_LEN)),
                "ClaudeBot",
                None
            ))
            .unwrap_err(),
            "invalid path"
        );
        for agent in ["", "   ", "<script>", "a/b", &"x".repeat(MAX_AGENT_LEN + 1)] {
            assert_eq!(
                validate(body("/llms.txt", agent, None)).unwrap_err(),
                "invalid agent",
                "{agent}"
            );
        }
    }

    #[test]
    fn a_country_that_isnt_a_code_is_dropped_not_rejected() {
        for country in ["", "  ", "I N", "12", "TOOLONGCODE"] {
            let event = validate(body("/llms.txt", "GPTBot", Some(country))).unwrap();
            assert_eq!(event.country, None, "{country:?}");
        }
    }

    #[test]
    fn unknown_fields_are_rejected() {
        let result = serde_json::from_str::<NewAgentFetchBody>(
            r#"{"path":"/llms.txt","agent":"GPTBot","kind":"pageview"}"#,
        );
        assert!(result.is_err());
    }
}
