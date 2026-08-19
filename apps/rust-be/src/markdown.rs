use pulldown_cmark::{CodeBlockKind, Event, Options, Parser, Tag, TagEnd, html};
use std::sync::LazyLock;
use syntect::easy::HighlightLines;
use syntect::highlighting::{Theme, ThemeSet};
use syntect::html::{
    IncludeBackground, append_highlighted_html_for_styled_line, start_highlighted_html_snippet,
};
use syntect::parsing::SyntaxSet;
use syntect::util::LinesWithEndings;

static SYNTAX_SET: LazyLock<SyntaxSet> = LazyLock::new(SyntaxSet::load_defaults_newlines);
static THEME: LazyLock<Theme> = LazyLock::new(|| {
    let mut themes = ThemeSet::load_defaults();
    themes
        .themes
        .remove("base16-ocean.dark")
        .expect("bundled syntect theme is present")
});

fn highlight_code_block(code: &str, lang: &str) -> String {
    let syntax = SYNTAX_SET
        .find_syntax_by_token(lang)
        .unwrap_or_else(|| SYNTAX_SET.find_syntax_plain_text());

    let mut highlighter = HighlightLines::new(syntax, &THEME);
    let (mut output, bg) = start_highlighted_html_snippet(&THEME);

    for line in LinesWithEndings::from(code) {
        if let Ok(regions) = highlighter.highlight_line(line, &SYNTAX_SET) {
            let _ = append_highlighted_html_for_styled_line(
                &regions[..],
                IncludeBackground::IfDifferent(bg),
                &mut output,
            );
        }
    }

    output.push_str("</pre>\n");
    output
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
            other => events.push(other),
        }
    }

    let mut rendered = String::new();
    html::push_html(&mut rendered, events.into_iter());

    rendered
}
