"use client";

import { useMemo, useState } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";

const lowlight = createLowlight(common);

// CodeBlockLowlight only uses lowlight.highlightAuto() to decorate the editor
// view — it never writes the detected language back onto the node. Left
// alone, every code block round-trips to Markdown as a bare ``` fence with no
// language hint, so the backend's syntect highlighter has nothing to key off
// and renders plain text. Override the markdown serializer to stamp a language
// onto the fence at save time.
//
// The auto-detect fallback is deliberately conservative. highlightAuto is
// happy to label a `curl ... -d '{json}'` block as `vbnet` on a relevance of
// 6, and a confidently wrong fence is worse than a bare one: an unknown
// language makes the backend fall through to its own detection, but a *valid*
// wrong one (shell tagged `javascript`) overrides it and highlights garbage.
// So: only languages the backend can render, and only above a relevance floor.
// Everything else emits a bare fence and lets the server decide.
const AUTO_DETECT_MIN_RELEVANCE = 8;

// Languages worth guessing at, restricted to what the backend's syntect syntax
// set actually resolves. Kept in sync with normalize_lang() in
// apps/rust-be/src/markdown.rs.
const AUTO_DETECTABLE = new Set([
  "rust",
  "bash",
  "shell",
  "json",
  "javascript",
  "typescript",
  "python",
  "sql",
  "yaml",
  "xml",
  "css",
  "go",
  "java",
  "c",
  "cpp",
  "ruby",
  "php",
]);

// Offered in the toolbar. Value is written verbatim into the fence, so every
// entry must be resolvable by normalize_lang() on the backend.
const LANGUAGES = [
  { value: "", label: "Auto" },
  { value: "rust", label: "Rust" },
  { value: "bash", label: "Shell" },
  { value: "json", label: "JSON" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "go", label: "Go" },
  { value: "diff", label: "Diff" },
  { value: "markdown", label: "Markdown" },
];

function autoDetectLanguage(code: string): string {
  if (code.trim().length === 0) {
    return "";
  }

  const result = lowlight.highlightAuto(code);
  const language = result.data?.language ?? "";
  const relevance = result.data?.relevance ?? 0;

  if (!AUTO_DETECTABLE.has(language) || relevance < AUTO_DETECT_MIN_RELEVANCE) {
    return "";
  }

  return language;
}

type MarkdownWritableState = {
  write: (text: string) => void;
  text: (text: string, escape?: boolean) => void;
  ensureNewLine: () => void;
  closeBlock: (node: unknown) => void;
};

type CodeBlockNode = {
  attrs: { language?: string | null };
  textContent: string;
};

const CodeBlock = CodeBlockLowlight.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownWritableState, node: CodeBlockNode) {
          const language =
            node.attrs.language || autoDetectLanguage(node.textContent);
          state.write("```" + language + "\n");
          state.text(node.textContent, false);
          state.ensureNewLine();
          state.write("```");
          state.closeBlock(node);
        },
      },
    };
  },
});

type RichTextEditorProps = {
  content: string;
  onChange: (markdown: string) => void;
};

type ToolbarButtonProps = {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
};

function ToolbarButton({
  active,
  onClick,
  children,
  label,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`cursor-pointer rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function UrlPrompt({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    if (value.trim().length > 0) {
      onSubmit(value.trim());
    }
  };

  return (
    // A plain div, not a <form>: this renders inside PostForm's own <form>,
    // and nested <form> elements are invalid HTML — the browser can perform
    // a native full-page submit instead of running our handler, wiping the
    // editor. Enter/Escape on the input replace form submit/cancel semantics.
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={submit}
        className="cursor-pointer rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [prompt, setPrompt] = useState<"link" | "image" | null>(null);

  const activeState = useEditorState({
    editor,
    // Active marks are reported only while the editor holds focus. An
    // unfocused editor still has a cursor parked at the start of the document,
    // so on open the toolbar would light up whichever block happened to be
    // first — showing "H3" as pressed before the user had clicked anything.
    // No focus means no cursor the user put there, so nothing is highlighted.
    selector: (ctx) => {
      const focused = ctx.editor.isFocused;
      const activeWhenFocused = (
        name: string,
        attrs?: Record<string, unknown>,
      ) => focused && ctx.editor.isActive(name, attrs);

      return {
        bold: activeWhenFocused("bold"),
        italic: activeWhenFocused("italic"),
        strike: activeWhenFocused("strike"),
        code: activeWhenFocused("code"),
        h2: activeWhenFocused("heading", { level: 2 }),
        h3: activeWhenFocused("heading", { level: 3 }),
        bulletList: activeWhenFocused("bulletList"),
        orderedList: activeWhenFocused("orderedList"),
        blockquote: activeWhenFocused("blockquote"),
        codeBlock: activeWhenFocused("codeBlock"),
        codeBlockLanguage:
          (ctx.editor.getAttributes("codeBlock").language as string | null) ??
          "",
        link: activeWhenFocused("link"),
      };
    },
  });

  if (prompt === "link") {
    return (
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-t-md border border-b-0 border-border bg-muted px-2 py-1.5">
        <UrlPrompt
          placeholder="https://…"
          onSubmit={(url) => {
            if (editor.state.selection.empty) {
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "text",
                  text: url,
                  marks: [{ type: "link", attrs: { href: url } }],
                })
                .run();
            } else {
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url })
                .run();
            }
            setPrompt(null);
          }}
          onCancel={() => setPrompt(null)}
        />
      </div>
    );
  }

  if (prompt === "image") {
    return (
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-t-md border border-b-0 border-border bg-muted px-2 py-1.5">
        <UrlPrompt
          placeholder="Image URL…"
          onSubmit={(url) => {
            editor.chain().focus().setImage({ src: url }).run();
            setPrompt(null);
          }}
          onCancel={() => setPrompt(null)}
        />
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 rounded-t-md border border-b-0 border-border bg-muted px-2 py-1.5">
      <ToolbarButton
        label="Bold"
        active={activeState.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Bold
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={activeState.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Italic
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={activeState.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        Strike
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={activeState.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <span className="font-mono">{"<>"}</span>
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Heading 2"
        active={activeState.h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={activeState.h3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Bullet list"
        active={activeState.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={activeState.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={activeState.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Quote
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={activeState.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        Code
      </ToolbarButton>
      {activeState.codeBlock ? (
        <select
          aria-label="Code block language"
          value={activeState.codeBlockLanguage}
          onChange={(event) =>
            editor
              .chain()
              .focus()
              .updateAttributes("codeBlock", {
                language: event.target.value || null,
              })
              .run()
          }
          className="cursor-pointer rounded-md border border-border bg-background px-1.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus:border-accent"
        >
          {LANGUAGES.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </select>
      ) : null}
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Link"
        active={activeState.link}
        onClick={() => setPrompt("link")}
      >
        Link
      </ToolbarButton>
      <ToolbarButton label="Image" onClick={() => setPrompt("image")}>
        Image
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  // Captured once: the editor owns its document after mount. Feeding the
  // live `content` prop back into `useEditor` on every keystroke (it changes
  // every time `onUpdate` below calls `onChange`) makes Tiptap treat the
  // options as changed on every render, which can tear down and recreate
  // the editor using a stale `content` value — wiping whatever was typed.
  const [initialContent] = useState(content);

  const extensions = useMemo(
    () => [
      StarterKit.configure({ codeBlock: false }),
      CodeBlock.configure({ lowlight }),
      // markdownLinks: typing or pasting `[text](url)` converts to a real
      // link. Off by default in the extension, which otherwise leaves that
      // syntax as literal text.
      Link.configure({ openOnClick: false, markdownLinks: true }),
      Image,
      Placeholder.configure({ placeholder: "Write your post…" }),
      Markdown.configure({ html: false }),
    ],
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialContent,
    editorProps: {
      attributes: {
        class: "post-content min-h-64 px-3 py-2 outline-none",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      const markdownStorage = (
        updatedEditor.storage as unknown as { markdown: MarkdownStorage }
      ).markdown;
      onChange(markdownStorage.getMarkdown());
    },
  });

  if (!editor) {
    return (
      <div className="min-h-64 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  return (
    <div>
      <Toolbar editor={editor} />
      <div className="rounded-b-md border border-border bg-background focus-within:border-accent">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
