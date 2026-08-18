use std::env;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("missing required environment variables: {0}")]
    Missing(&'static str),

    #[error("environment variable {0} is not valid UTF-8")]
    NotUnicode(&'static str),
}

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub admin_password_hash: String,
    pub cookie_key: String,
    pub revalidate_url: String,
    pub revalidate_secret: String,
    pub allowed_origin: String,
    pub cookie_domain: String,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            admin_password_hash: required("ADMIN_PASSWORD_HASH")?,
            cookie_key: required("COOKIE_KEY")?,
            revalidate_url: required("REVALIDATE_URL")?,
            revalidate_secret: required("REVALIDATE_SECRET")?,
            allowed_origin: required("ALLOWED_ORIGIN")?,
            cookie_domain: optional("COOKIE_DOMAIN")?,
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

fn optional(key: &'static str) -> Result<String, ConfigError> {
    match env::var(key) {
        Ok(value) => Ok(value),
        Err(env::VarError::NotPresent) => Ok(String::new()),
        Err(env::VarError::NotUnicode(_)) => Err(ConfigError::NotUnicode(key)),
    }
}
