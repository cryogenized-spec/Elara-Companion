# Elara Chat Markdown

Elara Chat uses a deliberately focused Markdown profile for conversational writing, roleplay, technical notes, and structured responses.

The underlying renderer uses GitHub-Flavored Markdown (GFM) plus normal line-break preservation. The goal is useful formatting without turning a conversation bubble into a full document editor.

## Supported formatting

| Feature | Example | Status |
|---|---|---|
| Bold | `**bold**` | Supported |
| Italic | `*italic*` | Supported |
| Strikethrough | `~~removed~~` | Supported |
| Inline code | `` `value` `` | Supported |
| Fenced code blocks | ` ```ts ... ``` ` | Supported |
| Unordered lists | `- item` | Supported |
| Ordered lists | `1. item` | Supported |
| Nested lists | indented list items | Supported |
| Task lists | `- [ ] task` / `- [x] done` | Supported |
| Blockquotes | `> quoted text` | Supported |
| Horizontal rules | `---` | Supported |
| Tables | GFM pipe tables | Supported |
| Links | `[label](https://example.com)` | Supported |
| Line breaks | normal newlines | Supported |
| Headings | `#`, `##`, `###` | Supported |

Headings deeper than level 3 are intentionally rendered as normal emphasized paragraph text instead of progressively larger document headings.

## Roleplay example

```markdown
*I glance toward the workbench and fold my arms.*

**"That seal is not going to hold for long."**

> The workshop falls quiet for a moment.

- Inspect the valve
  - Check the O-ring
  - Inspect the mating surface
- Replace the damaged seal

| Part | Status |
|---|---|
| Valve | ✅ Good |
| O-ring | ⚠️ Replace |
| Seal | ❌ Damaged |

---

`pressure_check()` should be performed before reassembly.
```

## Lists and indentation

Use normal Markdown list indentation for nested information:

```markdown
- Main item
  - Nested item
    - Deeper item
```

Use blockquotes for conversational indented/aside text:

```markdown
> This is an aside or quoted thought.
```

## What is intentionally not part of the chat profile

Raw HTML is not a supported chat-formatting mechanism. Arbitrary HTML is not rendered as markup.

Footnotes, raw HTML blocks, embedded scripts, and other document-oriented Markdown extensions are intentionally outside the chat profile.

## Storage and editing

Messages should be stored as their original Markdown text. Rendering is presentation-only.

That means editing, copying, exporting, conversation persistence, and AI context handling continue to work with the original Markdown source rather than generated HTML.
