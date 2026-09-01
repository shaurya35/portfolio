use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PostStatus {
    Draft,
    Published,
}

impl PostStatus {
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "draft" => Some(PostStatus::Draft),
            "published" => Some(PostStatus::Published),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            PostStatus::Draft => "draft",
            PostStatus::Published => "published",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "source", rename_all = "snake_case")]
pub enum PostSummaryBody {
    X { url: String },
    Medium { url: String },
    Native,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "source", rename_all = "snake_case")]
pub enum PostBody {
    X { url: String },
    Medium { url: String },
    Native { html: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "source", rename_all = "snake_case")]
pub enum PostSource {
    X { url: String },
    Medium { url: String },
    Native { markdown: String },
}

impl PostSource {
    pub fn into_parts(self) -> (&'static str, Option<String>, Option<String>) {
        match self {
            PostSource::X { url } => ("x", Some(url), None),
            PostSource::Medium { url } => ("medium", Some(url), None),
            PostSource::Native { markdown } => ("native", None, Some(markdown)),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct NewPost {
    pub slug: String,
    pub title: String,
    pub description: String,
    pub category: String,
    #[serde(flatten)]
    pub source: PostSource,
    pub status: PostStatus,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePost {
    pub title: String,
    pub description: String,
    pub category: String,
    #[serde(flatten)]
    pub source: PostSource,
    pub status: PostStatus,
}

#[derive(Debug, Serialize)]
pub struct AdminPost {
    pub id: i64,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub category: String,
    #[serde(flatten)]
    pub source: PostSource,
    pub status: PostStatus,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct PostRow {
    pub id: i64,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub source: String,
    pub url: Option<String>,
    pub markdown: Option<String>,
    /// Rendered once at write time (see `admin.rs` create/update) instead of
    /// re-run through the markdown/syntax-highlighting pipeline on every
    /// read. `None` only for a native row written before this column
    /// existed and not yet backfilled (see `backfill_post_html` in main.rs).
    pub html: Option<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug)]
pub struct MalformedRow {
    pub slug: String,
}

impl PostRow {
    fn status(&self) -> Result<PostStatus, MalformedRow> {
        PostStatus::parse(&self.status).ok_or_else(|| MalformedRow {
            slug: self.slug.clone(),
        })
    }

    pub fn into_summary(self) -> Result<PostSummary, MalformedRow> {
        let status = self.status()?;

        let body = match self.source.as_str() {
            "x" => self.url.map(|url| PostSummaryBody::X { url }),
            "medium" => self.url.map(|url| PostSummaryBody::Medium { url }),
            "native" => Some(PostSummaryBody::Native),
            _ => None,
        }
        .ok_or_else(|| MalformedRow {
            slug: self.slug.clone(),
        })?;

        Ok(PostSummary {
            slug: self.slug,
            title: self.title,
            description: self.description,
            category: self.category,
            body,
            status,
            published_at: self.published_at,
        })
    }

    pub fn into_admin(self) -> Result<AdminPost, MalformedRow> {
        let status = self.status()?;

        let source = match self.source.as_str() {
            "x" => self.url.map(|url| PostSource::X { url }),
            "medium" => self.url.map(|url| PostSource::Medium { url }),
            "native" => self
                .markdown
                .map(|markdown| PostSource::Native { markdown }),
            _ => None,
        }
        .ok_or_else(|| MalformedRow {
            slug: self.slug.clone(),
        })?;

        Ok(AdminPost {
            id: self.id,
            slug: self.slug,
            title: self.title,
            description: self.description,
            category: self.category,
            source,
            status,
            published_at: self.published_at,
            created_at: self.created_at,
            updated_at: self.updated_at,
        })
    }

    pub fn into_detail(self) -> Result<Post, MalformedRow> {
        let status = self.status()?;

        let body = match self.source.as_str() {
            "x" => self.url.map(|url| PostBody::X { url }),
            "medium" => self.url.map(|url| PostBody::Medium { url }),
            // Prefer the cached column; fall back to rendering on the fly
            // for a native row whose html hasn't been backfilled yet, so a
            // request never 500s on a not-yet-migrated row.
            "native" => match (self.html, self.markdown.as_deref()) {
                (Some(html), _) => Some(PostBody::Native { html }),
                (None, Some(markdown)) => Some(PostBody::Native {
                    html: crate::markdown::render(markdown),
                }),
                (None, None) => None,
            },
            _ => None,
        }
        .ok_or_else(|| MalformedRow {
            slug: self.slug.clone(),
        })?;

        Ok(Post {
            id: self.id,
            slug: self.slug,
            title: self.title,
            description: self.description,
            category: self.category,
            body,
            status,
            published_at: self.published_at,
            created_at: self.created_at,
            updated_at: self.updated_at,
        })
    }
}

#[derive(Debug, Serialize)]
pub struct PostSummary {
    pub slug: String,
    pub title: String,
    pub description: String,
    pub category: String,
    #[serde(flatten)]
    pub body: PostSummaryBody,
    pub status: PostStatus,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct Post {
    pub id: i64,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub category: String,
    #[serde(flatten)]
    pub body: PostBody,
    pub status: PostStatus,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
