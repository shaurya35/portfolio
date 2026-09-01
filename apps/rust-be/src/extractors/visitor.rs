use std::convert::Infallible;

use axum::extract::FromRequestParts;
use axum::http::HeaderMap;
use axum::http::request::Parts;

use crate::state::AppState;

const UNKNOWN_IP_PLACEHOLDER: &str = "unknown";

const BOT_USER_AGENT_SUBSTRINGS: &[&str] = &[
    "bot",
    "spider",
    "crawl",
    "slurp",
    "facebookexternalhit",
    "mediapartners",
];

pub struct Visitor {
    pub visitor_hash: String,
    pub referrer: Option<String>,
    pub country: Option<String>,
    pub device: &'static str,
    pub is_bot: bool,
}

impl FromRequestParts<AppState> for Visitor {
    type Rejection = Infallible;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let user_agent = header_value(&parts.headers, "user-agent").unwrap_or("");
        let lowered_user_agent = user_agent.to_lowercase();
        let ip = client_ip(&parts.headers);
        let salt = state.daily_salt.read().await.clone();

        Ok(Visitor {
            visitor_hash: visitor_hash(ip, user_agent, &salt),
            referrer: header_value(&parts.headers, "referer").map(str::to_owned),
            country: header_value(&parts.headers, "fly-client-country").map(str::to_owned),
            device: device(&lowered_user_agent),
            is_bot: is_bot(&lowered_user_agent),
        })
    }
}

fn header_value<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers.get(name).and_then(|value| value.to_str().ok())
}

pub(crate) fn client_ip(headers: &HeaderMap) -> &str {
    if let Some(value) = header_value(headers, "fly-client-ip") {
        return value;
    }

    let forwarded_last = header_value(headers, "x-forwarded-for")
        .and_then(|value| value.rsplit(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty());

    forwarded_last.unwrap_or(UNKNOWN_IP_PLACEHOLDER)
}

fn device(lowered_user_agent: &str) -> &'static str {
    if lowered_user_agent.contains("mobile")
        || lowered_user_agent.contains("android")
        || lowered_user_agent.contains("iphone")
    {
        "mobile"
    } else {
        "desktop"
    }
}

fn is_bot(lowered_user_agent: &str) -> bool {
    BOT_USER_AGENT_SUBSTRINGS
        .iter()
        .any(|needle| lowered_user_agent.contains(needle))
}

fn visitor_hash(ip: &str, user_agent: &str, salt: &str) -> String {
    let mut hasher = blake3::Hasher::new();
    hasher.update(ip.as_bytes());
    hasher.update(user_agent.as_bytes());
    hasher.update(salt.as_bytes());
    hasher.finalize().to_hex().to_string()
}
