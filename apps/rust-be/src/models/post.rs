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

/// `AdminPost` plus the cached rendered HTML, for the single-post admin read
/// used by the preview screen. Kept separate from `AdminPost` (used by
/// `list`) so the posts list response — trimmed for latency — doesn't grow a
/// full HTML blob per row again.
#[derive(Debug, Serialize)]
pub struct AdminPostDetail {
    #[serde(flatten)]
    pub post: AdminPost,
    pub html: Option<String>,
}

#[derive(Debug)]
pub struct MalformedRow {
    pub slug: String,
}

fn parse_status(status: &str, slug: &str) -> Result<PostStatus, MalformedRow> {
    PostStatus::parse(status).ok_or_else(|| MalformedRow {
        slug: slug.to_owned(),
    })
}

/// Exactly the columns `into_summary` reads.
///
/// `GET /posts` used to select the whole row — every post's markdown *and*
/// its rendered html — and then drop both on the floor building the summary.
/// Over a cross-region database connection that is a lot of bytes pulled
/// halfway around the world to be freed immediately, on the one public route
/// ISR re-polls on a timer.
pub struct PostSummaryRow {
    pub slug: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub source: String,
    pub url: Option<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

impl PostSummaryRow {
    pub fn into_summary(self) -> Result<PostSummary, MalformedRow> {
        let status = parse_status(&self.status, &self.slug)?;

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
            updated_at: self.updated_at,
        })
    }
}

/// Every column the admin shapes are built from, minus the rendered html —
/// which only the two reads that actually serve html need to fetch.
pub struct AdminRow {
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

impl AdminRow {
    pub fn into_admin(self) -> Result<AdminPost, MalformedRow> {
        let status = parse_status(&self.status, &self.slug)?;

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
}

/// `AdminRow` plus the cached rendered html — the row shape for the queries
/// whose SELECT/RETURNING carries it: the public post page and the admin
/// preview, which serve it, plus create/update, which get it back from the
/// row they just wrote.
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
    /// read.
    pub html: Option<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl PostRow {
    /// Peels the cached html off the rest, so the `AdminPost` mapping lives
    /// in exactly one place rather than once per row shape.
    fn split_html(self) -> (Option<String>, AdminRow) {
        (
            self.html,
            AdminRow {
                id: self.id,
                slug: self.slug,
                title: self.title,
                description: self.description,
                category: self.category,
                source: self.source,
                url: self.url,
                markdown: self.markdown,
                status: self.status,
                published_at: self.published_at,
                created_at: self.created_at,
                updated_at: self.updated_at,
            },
        )
    }

    pub fn into_admin(self) -> Result<AdminPost, MalformedRow> {
        self.split_html().1.into_admin()
    }

    /// Same shape as `into_admin`, plus the cached `html` column — already
    /// rendered at write time (see `render_native_html` in `routes/admin.rs`)
    /// for every post regardless of status, so a draft's preview needs no
    /// rendering of its own, just returning a column `into_admin` drops.
    pub fn into_admin_detail(self) -> Result<AdminPostDetail, MalformedRow> {
        let (html, row) = self.split_html();
        Ok(AdminPostDetail {
            post: row.into_admin()?,
            html,
        })
    }

    pub fn into_detail(self) -> Result<Post, MalformedRow> {
        let status = parse_status(&self.status, &self.slug)?;

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
    pub updated_at: DateTime<Utc>,
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
