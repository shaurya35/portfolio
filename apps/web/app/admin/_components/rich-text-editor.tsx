"use client";

import { useMemo, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
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
// and renders plain text. Override the markdown serializer to run the same
// auto-detection at save time when no language was explicitly set.
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
            node.attrs.language ||
            lowlight.highlightAuto(node.textContent).data?.language ||
            "";
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

function ToolbarButton({ active, onClick, children, label }: ToolbarButtonProps) {
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
    selector: (ctx) => ({
      bold: ctx.editor.isActive("bold"),
      italic: ctx.editor.isActive("italic"),
      strike: ctx.editor.isActive("strike"),
      h2: ctx.editor.isActive("heading", { level: 2 }),
      h3: ctx.editor.isActive("heading", { level: 3 }),
      bulletList: ctx.editor.isActive("bulletList"),
      orderedList: ctx.editor.isActive("orderedList"),
      blockquote: ctx.editor.isActive("blockquote"),
      codeBlock: ctx.editor.isActive("codeBlock"),
      link: ctx.editor.isActive("link"),
    }),
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
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
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
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton label="Link" active={activeState.link} onClick={() => setPrompt("link")}>
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
      Link.configure({ openOnClick: false }),
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
