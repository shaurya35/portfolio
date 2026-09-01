//! A minimal per-key fixed-window rate limiter. In-memory, so it resets on
//! restart like the rest of this process's transient state — an acceptable
//! trade-off here since it's defense-in-depth on top of argon2's own cost
//! (login) and the bot-UA filter (events), not the sole protection.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Above this many distinct keys, a sweep drops expired entries on the next
/// insert of a new key. Keeps long-uptime memory bounded without needing a
/// background task.
const SWEEP_THRESHOLD: usize = 10_000;

struct Window {
    count: u32,
    started_at: Instant,
}

pub struct RateLimiter {
    max_hits: u32,
    window: Duration,
    hits: Mutex<HashMap<String, Window>>,
}

impl RateLimiter {
    pub fn new(max_hits: u32, window: Duration) -> Self {
        Self {
            max_hits,
            window,
            hits: Mutex::new(HashMap::new()),
        }
    }

    /// Records one hit for `key` and returns whether it's still within the
    /// limit (`true` = allowed).
    pub fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut hits = self
            .hits
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());

        if hits.len() > SWEEP_THRESHOLD {
            hits.retain(|_, w| now.duration_since(w.started_at) <= self.window);
        }

        match hits.get_mut(key) {
            Some(w) if now.duration_since(w.started_at) <= self.window => {
                w.count += 1;
                w.count <= self.max_hits
            }
            _ => {
                hits.insert(
                    key.to_owned(),
                    Window {
                        count: 1,
                        started_at: now,
                    },
                );
                true
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_up_to_the_limit_then_blocks() {
        let limiter = RateLimiter::new(3, Duration::from_secs(60));
        assert!(limiter.check("a"));
        assert!(limiter.check("a"));
        assert!(limiter.check("a"));
        assert!(!limiter.check("a"));
    }

    #[test]
    fn keys_are_independent() {
        let limiter = RateLimiter::new(1, Duration::from_secs(60));
        assert!(limiter.check("a"));
        assert!(limiter.check("b"));
        assert!(!limiter.check("a"));
    }
}
