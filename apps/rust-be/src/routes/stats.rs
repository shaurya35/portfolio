use axum::Json;
use axum::extract::rejection::QueryRejection;
use axum::extract::{Query, State};
use serde::Deserialize;

use crate::error::AppError;
use crate::extractors::admin::Admin;
use crate::models::stats::{
    CountryCount, DailyCount, PathCount, ReferrerCount, Stats, TargetCount,
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

    let (daily, top_paths, top_targets, top_referrers, countries) = tokio::try_join!(
        sqlx::query_as!(
            DailyCount,
            r#"
            SELECT date(created_at) as "date!", count(*) as "pageviews!", count(distinct visitor_hash) as "visitors!"
            FROM events
            WHERE kind = 'pageview' AND created_at >= now() - make_interval(days => $1)
            GROUP BY date(created_at)
            ORDER BY date(created_at) DESC
            "#,
            days
        )
        .fetch_all(&state.pool),
        sqlx::query_as!(
            PathCount,
            r#"
            SELECT path as "path!", count(*) as "count!"
            FROM events
            WHERE kind = 'pageview' AND created_at >= now() - make_interval(days => $1)
            GROUP BY path
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
        sqlx::query_as!(
            ReferrerCount,
            r#"
            SELECT referrer as "referrer!", count(*) as "count!"
            FROM events
            WHERE kind = 'pageview' AND referrer IS NOT NULL AND created_at >= now() - make_interval(days => $1)
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
            WHERE kind = 'pageview' AND country IS NOT NULL AND created_at >= now() - make_interval(days => $1)
            GROUP BY country
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
    }))
}
