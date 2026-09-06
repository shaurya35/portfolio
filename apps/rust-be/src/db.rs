use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use std::time::Duration;

/// Builds the pool without opening a connection.
///
/// On Vercel's container runtime a cold start is billed as Active CPU, and
/// the instance's memory is billed for as long as booting takes — so the
/// goal is a boot that touches the network zero times. Binding the port is
/// all that has to happen before the process is useful; the first request
/// pays for the connection it actually needs, and the pool holds it for the
/// rest of the instance's life. The trade is that a bad DATABASE_URL now
/// surfaces as failing requests rather than a boot crash, which is the
/// better failure mode here anyway: a crash loop serves nothing either.
pub fn connect(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(10))
        .connect_lazy(database_url)
}
