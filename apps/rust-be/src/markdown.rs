use pulldown_cmark::{CodeBlockKind, Event, LinkType, Options, Parser, Tag, TagEnd, html};
use std::sync::LazyLock;
use syntect::html::{ClassStyle, ClassedHTMLGenerator};
use syntect::parsing::{SyntaxReference, SyntaxSet};
use syntect::util::LinesWithEndings;

const CODE_CLASS_STYLE: ClassStyle = ClassStyle::SpacedPrefixed { prefix: "sy-" };

static SYNTAX_SET: LazyLock<SyntaxSet> = LazyLock::new(SyntaxSet::load_defaults_newlines);

/// Fence info strings people actually type, mapped onto tokens the bundled
/// syntect syntax set recognises. Two classes of problem live here:
///
/// * Aliases syntect has never heard of (`typescript`, `zsh`, `golang`).
/// * Languages the default Sublime syntax set simply does not ship. There is
///   no TypeScript grammar, so `ts` degrades to JavaScript, which highlights
///   the shared 95% correctly instead of rendering flat grey text.
fn normalize_lang(lang: &str) -> Option<&'static str> {
    let token = match lang.trim().to_ascii_lowercase().as_str() {
        "rust" | "rs" => "rs",
        // No TypeScript grammar in the default set; JavaScript is the closest fit.
        "ts" | "typescript" | "tsx" | "js" | "jsx" | "javascript" | "mjs" | "cjs" | "node" => "js",
        "sh" | "bash" | "zsh" | "shell" | "console" | "terminal" | "shell-session" | "fish" => "sh",
        "json" | "jsonc" | "json5" => "json",
        "py" | "python" | "python3" => "py",
        "yaml" | "yml" => "yaml",
        "sql" | "postgres" | "postgresql" | "psql" => "sql",
        "html" => "html",
        "css" => "css",
        "xml" | "svg" => "xml",
        "go" | "golang" => "go",
        "rb" | "ruby" => "rb",
        "java" => "java",
        "c" => "c",
        "cpp" | "c++" | "cc" => "cpp",
        "cs" | "csharp" | "c#" => "cs",
        "php" => "php",
        "diff" | "patch" => "diff",
        "md" | "markdown" => "md",
        "make" | "makefile" => "makefile",
        "lua" => "lua",
        "scala" => "scala",
        "perl" => "pl",
        "haskell" | "hs" => "hs",
        "clojure" | "clj" => "clj",
        "erlang" | "erl" => "erl",
        "bat" | "batch" | "cmd" => "bat",
        _ => return None,
    };

    Some(token)
}

/// Resolve the grammar for a fenced block.
///
/// Order matters: an explicit, recognised fence language always wins, because
/// the author's stated intent beats any guess. Detection only runs when the
/// fence carries no language, or carries one nothing can resolve — which is the
/// common case here, since the Tiptap editor round-trips most blocks as a bare
/// ``` fence, and its `highlightAuto` occasionally emits junk like `vbnet`.
fn syntax_for(code: &str, lang: &str) -> &'static SyntaxReference {
    if !lang.trim().is_empty() {
        if let Some(token) = normalize_lang(lang)
            && let Some(syntax) = SYNTAX_SET.find_syntax_by_token(token)
        {
            return syntax;
        }

        if let Some(syntax) = SYNTAX_SET.find_syntax_by_token(lang.trim()) {
            return syntax;
        }
    }

    detect_syntax(code).unwrap_or_else(|| SYNTAX_SET.find_syntax_plain_text())
}

/// Best-effort language detection for unlabelled code blocks.
///
/// Deliberately a small scored heuristic rather than a statistical classifier:
/// the set of languages that show up on this site is narrow and known, and a
/// wrong-but-confident guess (highlighting shell as VB.NET) looks worse than
/// no highlighting at all. Anything scoring below `MIN_SCORE` stays plain.
fn detect_syntax(code: &str) -> Option<&'static SyntaxReference> {
    const MIN_SCORE: i32 = 4;

    let trimmed = code.trim();
    if trimmed.is_empty() {
        return None;
    }

    // A shebang is unambiguous; syntect matches these directly.
    if trimmed.starts_with("#!")
        && let Some(line) = trimmed.lines().next()
        && let Some(syntax) = SYNTAX_SET.find_syntax_by_first_line(line)
    {
        return Some(syntax);
    }

    let scores = [
        ("json", score_json(trimmed)),
        ("sh", score_shell(trimmed)),
        ("rs", score_rust(trimmed)),
        ("js", score_js(trimmed)),
        ("py", score_python(trimmed)),
        ("sql", score_sql(trimmed)),
        ("html", score_html(trimmed)),
        ("yaml", score_yaml(trimmed)),
    ];

    let (token, score) = scores.into_iter().max_by_key(|(_, score)| *score)?;
    if score < MIN_SCORE {
        return None;
    }

    SYNTAX_SET.find_syntax_by_token(token)
}

fn tally(code: &str, markers: &[(&str, i32)]) -> i32 {
    markers
        .iter()
        .filter(|(needle, _)| code.contains(needle))
        .map(|(_, weight)| *weight)
        .sum()
}

fn first_word(code: &str) -> &str {
    code.lines()
        .map(str::trim)
        .find(|line| !line.is_empty() && !line.starts_with('#'))
        .and_then(|line| line.split_whitespace().next())
        .unwrap_or("")
}

/// Commands that start a line in a shell snippet. This carries most of the
/// weight for shell detection: the `curl ... -d '{json}'` blocks on this site
/// are majority-JSON by character count, so keying off the leading command is
/// what stops them being classified as JSON.
const SHELL_COMMANDS: &[&str] = &[
    "curl",
    "wget",
    "echo",
    "cd",
    "ls",
    "cat",
    "cp",
    "mv",
    "rm",
    "mkdir",
    "touch",
    "git",
    "cargo",
    "rustup",
    "npm",
    "npx",
    "bun",
    "bunx",
    "pnpm",
    "yarn",
    "deno",
    "docker",
    "kubectl",
    "ssh",
    "scp",
    "sudo",
    "export",
    "source",
    "chmod",
    "chown",
    "grep",
    "sed",
    "awk",
    "find",
    "tar",
    "psql",
    "solana",
    "anchor",
    "spl-token",
    "fly",
    "flyctl",
    "vercel",
    "make",
    "brew",
    "apt",
    "apt-get",
    "systemctl",
    "openssl",
    "jq",
    "diff",
    "which",
    "printf",
    "set",
    "unset",
];

fn score_shell(code: &str) -> i32 {
    let mut score = 0;

    let head = first_word(code);
    let head = head.strip_prefix('$').unwrap_or(head);
    if SHELL_COMMANDS.contains(&head) {
        score += 9;
    }

    // A `$ ` prompt, or any later line starting with a known command.
    if code
        .lines()
        .map(str::trim)
        .any(|line| line.starts_with("$ ") || line.starts_with("#!/"))
    {
        score += 4;
    }

    score += tally(
        code,
        &[
            (" | ", 2),
            (" && ", 2),
            ("$(", 2),
            ("${", 1),
            (" -X ", 3),
            (" -H ", 3),
            (" --", 2),
            (" > ", 1),
            (" >> ", 1),
            ("2>&1", 2),
        ],
    );

    score
}

fn score_rust(code: &str) -> i32 {
    tally(
        code,
        &[
            ("fn ", 3),
            ("let mut ", 4),
            ("impl ", 4),
            ("pub fn", 4),
            ("-> ", 2),
            ("::", 2),
            ("&str", 3),
            ("Vec<", 3),
            ("Result<", 3),
            ("Option<", 3),
            (".unwrap()", 3),
            (".iter()", 2),
            ("match ", 2),
            ("#[", 3),
            ("Some(", 2),
            ("String::", 3),
            ("use ", 1),
            ("mod ", 1),
            ("async fn", 3),
            (".await", 3),
        ],
    )
}

fn score_json(code: &str) -> i32 {
    let opens = code.starts_with('{') || code.starts_with('[');
    let closes = code.ends_with('}') || code.ends_with(']');
    if !(opens && closes) {
        return 0;
    }

    // Shell here-doc payloads and JS object literals both look JSON-ish; the
    // quoted-key form is what separates real JSON from them.
    let mut score = 6;
    if code.contains("\": ") || code.contains("\":") {
        score += 4;
    }
    if code.contains('=') || code.contains("//") {
        score -= 4;
    }

    score
}

fn score_js(code: &str) -> i32 {
    tally(
        code,
        &[
            ("const ", 3),
            ("=> ", 3),
            ("function ", 3),
            ("export ", 2),
            ("import ", 2),
            (" from \"", 3),
            ("console.log", 4),
            ("async ", 1),
            ("await ", 1),
            ("interface ", 2),
            ("typeof ", 1),
            ("null", 1),
            ("undefined", 2),
            ("=== ", 3),
            ("document.", 3),
            ("window.", 3),
        ],
    )
}

fn score_python(code: &str) -> i32 {
    tally(
        code,
        &[
            ("def ", 4),
            ("elif ", 4),
            ("print(", 3),
            ("self.", 4),
            ("import ", 1),
            ("__init__", 5),
            ("None", 2),
            ("True", 2),
            ("False", 2),
            ("lambda ", 3),
            (":\n    ", 1),
        ],
    )
}

fn score_sql(code: &str) -> i32 {
    let upper = code.to_ascii_uppercase();
    tally(
        &upper,
        &[
            ("SELECT ", 5),
            (" FROM ", 4),
            (" WHERE ", 3),
            ("INSERT INTO", 5),
            ("UPDATE ", 3),
            ("DELETE FROM", 5),
            ("CREATE TABLE", 5),
            ("JOIN ", 3),
            ("GROUP BY", 3),
            ("ORDER BY", 2),
        ],
    )
}

fn score_html(code: &str) -> i32 {
    if !code.starts_with('<') {
        return 0;
    }

    tally(
        code,
        &[
            ("</", 4),
            ("<div", 3),
            ("<span", 3),
            ("<!DOCTYPE", 5),
            ("<html", 5),
            ("<p>", 2),
            ("class=\"", 2),
        ],
    )
}

fn score_yaml(code: &str) -> i32 {
    let mut score = 0;
    if code.starts_with("---") {
        score += 3;
    }

    // `key: value` at the start of a line, with no brace/bracket wrapper.
    let keyed = code
        .lines()
        .filter(|line| {
            let trimmed = line.trim_start();
            !trimmed.starts_with('#')
                && trimmed
                    .split_once(": ")
                    .is_some_and(|(key, _)| !key.contains(['{', '"', '\'', '(']))
        })
        .count();

    if keyed >= 2 && !code.starts_with('{') {
        score += 4;
    }
    if code.lines().any(|line| line.trim_start().starts_with("- ")) {
        score += 2;
    }

    score
}

/// Post content is read standalone (no in-page nav back to the writing
/// list), so a same-tab link navigates the reader away from the article
/// entirely. `target="_blank"` keeps them on the post; `rel="noopener
/// noreferrer"` is required alongside it so the opened page can't reach back
/// into `window.opener`. Mirrors pulldown-cmark's own html.rs for the
/// mailto: prefix and escaping, since we're replacing its default renderer
/// for this tag rather than calling into it.
fn link_open_tag(link_type: LinkType, dest_url: &str, title: &str) -> String {
    let mut href = String::new();
    if link_type == LinkType::Email {
        href.push_str("mailto:");
    }
    let _ = pulldown_cmark_escape::escape_href(&mut href, dest_url);

    let mut tag = format!("<a href=\"{href}\"");
    if link_type != LinkType::Email {
        tag.push_str(" target=\"_blank\" rel=\"noopener noreferrer\"");
    }
    if !title.is_empty() {
        let mut escaped_title = String::new();
        let _ = pulldown_cmark_escape::escape_html(&mut escaped_title, title);
        tag.push_str(&format!(" title=\"{escaped_title}\""));
    }
    tag.push('>');
    tag
}

fn highlight_code_block(code: &str, lang: &str) -> String {
    let syntax = syntax_for(code, lang);

    let mut generator =
        ClassedHTMLGenerator::new_with_class_style(syntax, &SYNTAX_SET, CODE_CLASS_STYLE);
    for line in LinesWithEndings::from(code) {
        let _ = generator.parse_html_for_line_which_includes_newline(line);
    }

    format!(
        "<pre class=\"sy-code\"><code>{}</code></pre>\n",
        generator.finalize()
    )
}

pub fn render(markdown: &str) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_SMART_PUNCTUATION);
    options.insert(Options::ENABLE_TASKLISTS);

    let parser = Parser::new_ext(markdown, options)
        .filter(|event| !matches!(event, Event::Html(_) | Event::InlineHtml(_)));

    let mut events = Vec::new();
    let mut code_block: Option<(String, String)> = None;

    for event in parser {
        match event {
            Event::Start(Tag::CodeBlock(kind)) => {
                let lang = match kind {
                    CodeBlockKind::Fenced(info) => {
                        info.split_whitespace().next().unwrap_or("").to_string()
                    }
                    CodeBlockKind::Indented => String::new(),
                };
                code_block = Some((lang, String::new()));
            }
            Event::Text(text) if code_block.is_some() => {
                if let Some((_, code)) = code_block.as_mut() {
                    code.push_str(&text);
                }
            }
            Event::End(TagEnd::CodeBlock) => {
                if let Some((lang, code)) = code_block.take() {
                    events.push(Event::Html(highlight_code_block(&code, &lang).into()));
                }
            }
            Event::Start(Tag::Link {
                link_type,
                dest_url,
                title,
                ..
            }) => {
                events.push(Event::Html(
                    link_open_tag(link_type, &dest_url, &title).into(),
                ));
            }
            Event::End(TagEnd::Link) => {
                events.push(Event::Html("</a>".into()));
            }
            other => events.push(other),
        }
    }

    let mut rendered = String::new();
    html::push_html(&mut rendered, events.into_iter());

    rendered
}

#[cfg(test)]
mod tests {
    use super::*;

    fn spans(md: &str) -> usize {
        render(md).matches("<span class=\"sy-").count()
    }

    fn detected(code: &str) -> Option<&'static str> {
        detect_syntax(code).map(|syntax| syntax.name.as_str())
    }

    // The two blocks from the reported bug report, verbatim in shape.
    const CURL_BLOCK: &str = r#"curl https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d '
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTransaction"
}' > fixtures/pumpfun-buy-via-flashx.json"#;

    const RUST_BLOCK: &str = r#"fn decode_fixture(path: &str) -> Result<Vec<TradeEvent>, Box<dyn Error>> {
    let pumpfun_program_id = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
    let decoder = PumpfunDecoder;
    let mut trades = Vec::new();
    for group in json["result"]["meta"]["innerInstructions"].as_array().unwrap() {
        continue;
    }
}"#;

    #[test]
    fn unlabelled_shell_block_is_detected_not_left_plain() {
        assert_eq!(detected(CURL_BLOCK), Some("Bourne Again Shell (bash)"));
        assert!(spans(&format!("```\n{CURL_BLOCK}\n```")) > 5);
    }

    #[test]
    fn unlabelled_rust_block_is_detected_not_left_plain() {
        assert_eq!(detected(RUST_BLOCK), Some("Rust"));
        assert!(spans(&format!("```\n{RUST_BLOCK}\n```")) > 10);
    }

    #[test]
    fn curl_wrapping_json_is_shell_not_json() {
        // Majority of the characters are JSON, but it is a shell command.
        assert_eq!(detected(CURL_BLOCK), Some("Bourne Again Shell (bash)"));
    }

    #[test]
    fn explicit_language_beats_detection() {
        // Rust code deliberately fenced as json stays json: author intent wins.
        let syntax = syntax_for(RUST_BLOCK, "json");
        assert_eq!(syntax.name, "JSON");
    }

    #[test]
    fn typescript_alias_falls_back_to_javascript() {
        // syntect ships no TypeScript grammar; ts must not render flat.
        assert_eq!(syntax_for("const x: number = 1;", "ts").name, "JavaScript");
        assert_eq!(syntax_for("const x = 1;", "typescript").name, "JavaScript");
    }

    #[test]
    fn junk_language_from_editor_autodetect_still_highlights() {
        // lowlight mislabels shell as `vbnet`; syntect has no such token.
        // The block must fall through to detection instead of rendering plain.
        assert_eq!(
            syntax_for(CURL_BLOCK, "vbnet").name,
            "Bourne Again Shell (bash)"
        );
    }

    #[test]
    fn common_aliases_resolve() {
        for (lang, expected) in [
            ("rust", "Rust"),
            ("bash", "Bourne Again Shell (bash)"),
            ("zsh", "Bourne Again Shell (bash)"),
            ("console", "Bourne Again Shell (bash)"),
            ("json", "JSON"),
            ("yml", "YAML"),
            ("golang", "Go"),
            ("python3", "Python"),
            ("postgres", "SQL"),
        ] {
            assert_eq!(syntax_for("", lang).name, expected, "alias {lang}");
        }
    }

    #[test]
    fn prose_is_left_plain_rather_than_guessed() {
        let prose = "This is just a sentence of ordinary English text.";
        assert_eq!(detected(prose), None);
    }

    #[test]
    fn json_block_detected() {
        assert_eq!(detected(r#"{"jsonrpc": "2.0", "id": 1}"#), Some("JSON"));
    }

    #[test]
    fn shebang_wins() {
        assert_eq!(
            detected("#!/bin/bash\nset -euo pipefail"),
            Some("Bourne Again Shell (bash)")
        );
    }

    #[test]
    fn raw_html_is_still_stripped_from_markdown() {
        // Guard the existing XSS protection while changing this file.
        let out = render("<script>alert(1)</script>\n\nhello");
        assert!(!out.contains("<script"));
    }

    #[test]
    fn links_open_in_a_new_tab() {
        let out = render("[Medium](https://medium.com/@someone/post)");
        assert!(
            out.contains(r#"<a href="https://medium.com/@someone/post" target="_blank" rel="noopener noreferrer">Medium</a>"#),
            "got: {out}"
        );
    }

    #[test]
    fn email_autolinks_keep_mailto_and_skip_new_tab() {
        let out = render("<hello@example.com>");
        assert!(out.contains(r#"href="mailto:hello@example.com""#), "got: {out}");
        assert!(!out.contains("target=\"_blank\""), "got: {out}");
    }
}
