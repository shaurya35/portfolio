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
    /// Resolved from `posts.title` when the path is a `/writing/{slug}`
    /// route; `None` for every other path (home, projects, etc.).
    pub title: Option<String>,
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
pub struct DeviceCount {
    pub device: String,
    pub count: i64,
}

/// Per-post traffic for the admin posts list. `views` counts pageviews of
/// the post's own page (native posts); `clicks` counts opens of an X or
/// Medium post from the site's writing lists (the `post:<slug>` click
/// target), since those posts have no page here to view.
#[derive(Debug, Serialize)]
pub struct PostTraffic {
    pub slug: String,
    pub views: i64,
    pub clicks: i64,
}

#[derive(Debug, Serialize)]
pub struct Stats {
    pub daily: Vec<DailyCount>,
    pub top_paths: Vec<PathCount>,
    pub top_targets: Vec<TargetCount>,
    pub top_referrers: Vec<ReferrerCount>,
    pub countries: Vec<CountryCount>,
    pub devices: Vec<DeviceCount>,
}
