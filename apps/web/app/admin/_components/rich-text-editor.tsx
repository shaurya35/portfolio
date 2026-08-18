"use client";

import { useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";

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

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim().length > 0) {
          onSubmit(value.trim());
        }
      }}
      className="flex items-center gap-2"
    >
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
      />
      <button
        type="submit"
        className="cursor-pointer rounded-md bg-accent px-2 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90"
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
    </form>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [prompt, setPrompt] = useState<"link" | "image" | null>(null);

  if (prompt === "link") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-t-md border border-b-0 border-border bg-muted px-2 py-1.5">
        <UrlPrompt
          placeholder="https://…"
          onSubmit={(url) => {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            setPrompt(null);
          }}
          onCancel={() => setPrompt(null)}
        />
      </div>
    );
  }

  if (prompt === "image") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-t-md border border-b-0 border-border bg-muted px-2 py-1.5">
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
    <div className="flex flex-wrap items-center gap-1.5 rounded-t-md border border-b-0 border-border bg-muted px-2 py-1.5">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Bold
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Italic
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        Strike
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Quote
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        Code
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
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
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: "Write your post…" }),
      Markdown.configure({ html: false }),
    ],
    content,
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
