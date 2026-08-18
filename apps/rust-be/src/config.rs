use std::env;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("missing required environment variables: {0}")]
    Missing(&'static str),

    #[error("environment variable {0} is not valid UTF-8")]
    NotUnicode(&'static str),
}

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        Ok(Self {
            database_url: required("DATABASE_URL")?,
        })
    }
}

fn required(key: &'static str) -> Result<String, ConfigError> {
    match env::var(key) {
        Ok(value) => Ok(value),
        Err(env::VarError::NotPresent) => Err(ConfigError::Missing(key)),
        Err(env::VarError::NotUnicode(_)) => Err(ConfigError::NotUnicode(key)),
    }
}
