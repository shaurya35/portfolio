use std::sync::OnceLock;
use std::time::Duration;

use crate::config::Config;

static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn client() -> &'static reqwest::Client {
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .expect("failed to build reqwest client")
    })
}

/// Awaited (not fire-and-forget) so a failure surfaces in the admin request's
/// own logs instead of a background task's, which is where it went unnoticed
/// for days after the rust-be Vercel migration broke REVALIDATE_URL.
pub async fn trigger(config: &Config) {
    let result = client()
        .post(&config.revalidate_url)
        .header("X-Revalidate-Secret", &config.revalidate_secret)
        .send()
        .await;

    match result {
        Ok(response) if response.status().is_success() => {
            tracing::info!("revalidate webhook succeeded");
        }
        Ok(response) => {
            tracing::error!(
                "revalidate webhook responded with status {}",
                response.status()
            );
        }
        Err(err) => {
            tracing::error!("revalidate webhook request failed: {err}");
        }
    }
}
