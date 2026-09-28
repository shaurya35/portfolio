use serde::Deserialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EventKind {
    Pageview,
    Click,
}

impl EventKind {
    pub fn as_str(self) -> &'static str {
        match self {
            EventKind::Pageview => "pageview",
            EventKind::Click => "click",
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NewEventBody {
    pub kind: EventKind,
    pub path: String,
    pub target: Option<String>,
    /// The external site the visit came from, as a bare hostname, sent by
    /// the page itself (see components/beacon.tsx). Not the request's
    /// Referer header: a beacon's Referer is the page sending it, so every
    /// visit used to be recorded as referred by the site itself.
    #[serde(default)]
    pub referrer: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // Regression: ISSUE-008 — every visit was recorded as referred by the
    // site itself (the beacon's own Referer header). The page now sends the
    // real source in the body; older pages, which don't, must still parse.
    // Found by /qa on 2026-09-28
    // Report: .gstack/qa-reports/qa-report-shauryacodes-me-2026-09-28.md
    #[test]
    fn referrer_comes_from_the_body_when_sent() {
        let body: NewEventBody =
            serde_json::from_str(r#"{"kind":"pageview","path":"/","referrer":"www.google.com"}"#)
                .unwrap();
        assert_eq!(body.referrer.as_deref(), Some("www.google.com"));
    }

    #[test]
    fn referrer_is_optional() {
        let body: NewEventBody =
            serde_json::from_str(r#"{"kind":"pageview","path":"/writing"}"#).unwrap();
        assert_eq!(body.referrer, None);
    }

    #[test]
    fn unknown_fields_are_still_rejected() {
        let result =
            serde_json::from_str::<NewEventBody>(r#"{"kind":"pageview","path":"/","x":1}"#);
        assert!(result.is_err());
    }
}
