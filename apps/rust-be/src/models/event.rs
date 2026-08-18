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
}
