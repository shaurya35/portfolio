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
    // Automated browsers that run the page's JavaScript, so they reach the
    // beacon: Puppeteer/Playwright scrapers and monitors ("HeadlessChrome")
    // and Lighthouse/PageSpeed audits ("Chrome-Lighthouse"). None of the
    // substrings above matched them, so each run counted as a visitor.
    "headless",
    "lighthouse",
];

pub struct Visitor {
    pub visitor_hash: String,
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
            country: client_country(&parts.headers).map(str::to_owned),
            device: device(&lowered_user_agent),
            is_bot: is_bot(&lowered_user_agent),
        })
    }
}

fn header_value<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers.get(name).and_then(|value| value.to_str().ok())
}

pub(crate) fn client_ip(headers: &HeaderMap) -> &str {
    // Vercel doesn't set fly-client-ip (leftover from the pre-Vercel Fly.io
    // deployment) — kept only in case this ever runs behind Fly again.
    // x-forwarded-for is what Vercel actually sends, and every request has
    // hit that fallback in production since the migration.
    if let Some(value) = header_value(headers, "fly-client-ip") {
        return value;
    }

    let forwarded_last = header_value(headers, "x-forwarded-for")
        .and_then(|value| value.rsplit(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty());

    forwarded_last.unwrap_or(UNKNOWN_IP_PLACEHOLDER)
}

/// Same story as `client_ip`: `fly-client-country` never fires on Vercel.
/// `x-vercel-ip-country` is what Vercel actually sets. Every event recorded
/// since the migration has had `country = NULL` as a result — this wasn't a
/// low-sample-size gap, the header it read has never existed on this host.
fn client_country(headers: &HeaderMap) -> Option<&str> {
    header_value(headers, "x-vercel-ip-country")
        .or_else(|| header_value(headers, "fly-client-country"))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn automated_browsers_are_bots() {
        for ua in [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36",
            "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        ] {
            assert!(is_bot(&ua.to_lowercase()), "{ua}");
        }
    }

    #[test]
    fn real_browsers_are_not_bots() {
        for ua in [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
        ] {
            assert!(!is_bot(&ua.to_lowercase()), "{ua}");
        }
    }
}
