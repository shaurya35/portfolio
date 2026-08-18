use std::sync::OnceLock;

use crate::config::Config;

static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn client() -> &'static reqwest::Client {
    CLIENT.get_or_init(reqwest::Client::new)
}

pub fn trigger(config: &Config) {
    let url = config.revalidate_url.clone();
    let secret = config.revalidate_secret.clone();

    tokio::spawn(async move {
        let result = client()
            .post(&url)
            .header("X-Revalidate-Secret", secret)
            .send()
            .await;

        match result {
            Ok(response) if !response.status().is_success() => {
                tracing::error!(
                    "revalidate webhook responded with status {}",
                    response.status()
                );
            }
            Err(err) => {
                tracing::error!("revalidate webhook request failed: {err}");
            }
            Ok(_) => {}
        }
    });
}
