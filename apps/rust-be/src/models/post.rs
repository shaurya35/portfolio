use chrono::{DateTime, Utc};
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
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

pub struct PostRow {
    pub id: i64,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub source: String,
    pub url: Option<String>,
    pub markdown: Option<String>,
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

    pub fn into_detail(self) -> Result<Post, MalformedRow> {
        let status = self.status()?;

        let body = match self.source.as_str() {
            "x" => self.url.map(|url| PostBody::X { url }),
            "medium" => self.url.map(|url| PostBody::Medium { url }),
            "native" => self.markdown.as_deref().map(|markdown| PostBody::Native {
                html: crate::markdown::render(markdown),
            }),
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
