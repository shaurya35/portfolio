use chrono::NaiveDate;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DailyCount {
    pub date: NaiveDate,
    pub pageviews: i64,
    pub visitors: i64,
}

#[derive(Debug, Serialize)]
pub struct PathCount {
    pub path: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct TargetCount {
    pub target: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct ReferrerCount {
    pub referrer: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct CountryCount {
    pub country: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct Stats {
    pub daily: Vec<DailyCount>,
    pub top_paths: Vec<PathCount>,
    pub top_targets: Vec<TargetCount>,
    pub top_referrers: Vec<ReferrerCount>,
    pub countries: Vec<CountryCount>,
}
