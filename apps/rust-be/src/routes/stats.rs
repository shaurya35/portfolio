use axum::Json;
use axum::extract::rejection::QueryRejection;
use axum::extract::{Query, State};
use serde::Deserialize;

use crate::error::AppError;
use crate::extractors::admin::Admin;
use crate::models::stats::{
    CountryCount, DailyCount, DeviceCount, PathCount, PostTraffic, ReferrerCount, Stats,
    TargetCount,
};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub(super) struct StatsQuery {
    days: Option<i32>,
}

pub(super) async fn stats(
    State(state): State<AppState>,
    _admin: Admin,
    query: Result<Query<StatsQuery>, QueryRejection>,
) -> Result<Json<Stats>, AppError> {
    let Query(params) = query?;
    let days = params.days.unwrap_or(30).clamp(1, 365);

    // Every pageview query skips /admin: those are the site owner working
    // in the editor, not visitors (they were ~10% of recorded pageviews
    // before the beacon stopped sending them).
    let (daily, top_paths, top_targets, top_referrers, countries, devices) = tokio::try_join!(
        sqlx::query_as!(
            DailyCount,
            r#"
            SELECT date(created_at) as "date!", count(*) as "pageviews!", count(distinct visitor_hash) as "visitors!"
            FROM events
            WHERE kind = 'pageview' AND path NOT LIKE '/admin%' AND created_at >= now() - make_interval(days => $1)
            GROUP BY date(created_at)
            ORDER BY date(created_at) DESC
            "#,
            days
        )
        .fetch_all(&state.pool),
        sqlx::query_as!(
            PathCount,
            r#"
            SELECT
                e.path as "path!",
                (SELECT p.title FROM posts p WHERE '/writing/' || p.slug = e.path) as "title?",
                count(*) as "count!"
            FROM events e
            WHERE e.kind = 'pageview' AND e.path NOT LIKE '/admin%' AND e.created_at >= now() - make_interval(days => $1)
            GROUP BY e.path
            ORDER BY count(*) DESC
            LIMIT 10
            "#,
            days
        )
        .fetch_all(&state.pool),
        sqlx::query_as!(
            TargetCount,
            r#"
            SELECT target as "target!", count(*) as "count!"
            FROM events
            WHERE kind = 'click' AND target IS NOT NULL AND created_at >= now() - make_interval(days => $1)
            GROUP BY target
            ORDER BY count(*) DESC
            LIMIT 10
            "#,
            days
        )
        .fetch_all(&state.pool),
        // Rows with a scheme ("https://www.shauryacodes.me/") predate
        // referrers coming from the page: they held the beacon request's own
        // Referer, i.e. this site, never where a visitor actually came from.
        // Current rows are bare hostnames, so this skips only the old ones.
        sqlx::query_as!(
            ReferrerCount,
            r#"
            SELECT referrer as "referrer!", count(*) as "count!"
            FROM events
            WHERE kind = 'pageview' AND path NOT LIKE '/admin%' AND referrer IS NOT NULL AND referrer NOT LIKE '%://%'
              AND created_at >= now() - make_interval(days => $1)
            GROUP BY referrer
            ORDER BY count(*) DESC
            LIMIT 10
            "#,
            days
        )
        .fetch_all(&state.pool),
        sqlx::query_as!(
            CountryCount,
            r#"
            SELECT country as "country!", count(*) as "count!"
            FROM events
            WHERE kind = 'pageview' AND path NOT LIKE '/admin%' AND country IS NOT NULL AND created_at >= now() - make_interval(days => $1)
            GROUP BY country
            ORDER BY count(*) DESC
            LIMIT 10
            "#,
            days
        )
        .fetch_all(&state.pool),
        sqlx::query_as!(
            DeviceCount,
            r#"
            SELECT device as "device!", count(*) as "count!"
            FROM events
            WHERE kind = 'pageview' AND path NOT LIKE '/admin%' AND device IS NOT NULL AND created_at >= now() - make_interval(days => $1)
            GROUP BY device
            ORDER BY count(*) DESC
            LIMIT 10
            "#,
            days
        )
        .fetch_all(&state.pool),
    )?;

    Ok(Json(Stats {
        daily,
        top_paths,
        top_targets,
        top_referrers,
        countries,
        devices,
    }))
}

/// Views (or, for link posts, outbound clicks) per post over the last
/// `days`, for the admin posts list. One pass over the window's events,
/// matched to each post by its page path or click target.
pub(super) async fn post_traffic(
    State(state): State<AppState>,
    _admin: Admin,
    query: Result<Query<StatsQuery>, QueryRejection>,
) -> Result<Json<Vec<PostTraffic>>, AppError> {
    let Query(params) = query?;
    let days = params.days.unwrap_or(30).clamp(1, 365);

    let rows = sqlx::query_as!(
        PostTraffic,
        r#"
        SELECT
            p.slug as "slug!",
            count(e.id) FILTER (WHERE e.kind = 'pageview') as "views!",
            count(e.id) FILTER (WHERE e.kind = 'click') as "clicks!"
        FROM posts p
        LEFT JOIN events e
            ON e.created_at >= now() - make_interval(days => $1)
            AND (
                (e.kind = 'pageview' AND e.path = '/writing/' || p.slug)
                OR (e.kind = 'click' AND e.target = 'post:' || p.slug)
            )
        GROUP BY p.slug
        "#,
        days
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(rows))
}
