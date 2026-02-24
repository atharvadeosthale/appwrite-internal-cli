# Appwrite Internal CLI Documentation

## Overview

The Appwrite Internal CLI provides commands for managing blog content on the Appwrite website. It supports both **interactive mode** (terminal prompts) and **non-interactive mode** (CLI flags) for automation and CI/CD integration.

```
npx appwrite-internal-cli <group> <command> [flags]
```

Node.js >= 18 is required.

---

## Commands

| Command | Description |
|---------|-------------|
| `blog create-author` | Create a new blog author profile |
| `blog create-blog` | Create a new blog post |
| `blog import-notion` | Import a Notion export into an existing blog post |
| `blog sanitize` | Fix headings and curly quotes in a blog post |

### APIs (JSON output)

| Command | Description |
|---------|-------------|
| `blog get-authors` | List all authors as a JSON array |
| `blog get-categories` | List all categories as a JSON array |
| `blog get-blogs` | List all blog posts as a JSON array |

These commands output **only** valid JSON to stdout — no headers, no color codes, no progress text. They are designed for machine consumption by other applications.

---

## Non-Interactive Mode

When flags are provided, the CLI skips the corresponding interactive prompts. To run fully non-interactively, pass all required flags plus `--force` (to skip confirmation prompts).

**Detection:** The CLI detects non-interactive mode when any command-specific flag is present. Optional fields that are not provided via flags will use their defaults instead of prompting.

---

## `blog create-author`

Create a new author profile under `src/routes/blog/author/<slug>/`.

### Flags

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--name <string>` | Yes | — | Author's full name |
| `--slug <string>` | No | Auto-generated from name | URL-safe slug (lowercase, hyphens only) |
| `--role <string>` | Yes | — | Job title (e.g., "Developer Advocate") |
| `--bio <string>` | No | `"<role> at Appwrite"` | Short biography (1-2 sentences) |
| `--avatar <path>` | No | — | Path to avatar image file. Copied to `static/images/avatars/<slug>.png` |
| `--twitter <url>` | No | — | Twitter/X profile URL |
| `--github <url>` | No | — | GitHub profile URL |
| `--linkedin <url>` | No | — | LinkedIn profile URL |
| `--force` | No | `false` | Skip confirmation prompt |

### Files Created

- `src/routes/blog/author/<slug>/+page.markdoc` — Author profile with frontmatter
- `static/images/avatars/<slug>.png` — Avatar image (if `--avatar` provided)

### Frontmatter Schema

```yaml
---
layout: author
slug: <slug>
name: <name>
role: <role>
bio: <bio>
avatar: /images/avatars/<slug>.png
twitter: <url>     # optional, omitted if empty
github: <url>      # optional, omitted if empty
linkedin: <url>    # optional, omitted if empty
---
```

### Examples

**Interactive:**
```bash
npx appwrite-internal-cli blog create-author
```

**Non-interactive:**
```bash
npx appwrite-internal-cli blog create-author \
  --name "Jane Doe" \
  --role "Developer Advocate" \
  --bio "Building the future of backend development" \
  --avatar ./avatar.png \
  --github "https://github.com/janedoe" \
  --twitter "https://x.com/janedoe" \
  --force
```

### Validation

- **name**: Required, non-empty
- **slug**: Must be unique (no existing author directory), lowercase alphanumeric and hyphens only (`/^[a-z0-9-]+$/`)
- **URLs**: Must be valid URL format if provided (parsed via `new URL()`)

### Exit Behavior

- Exits with code `0` on success or user cancellation
- Throws an error (exits non-zero) if required flags are missing in non-interactive mode or validation fails

---

## `blog create-blog`

Create a new blog post under `src/routes/blog/post/<slug>/`.

### Flags

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--title <string>` | Yes | — | Blog post title |
| `--slug <string>` | No | Auto-generated from title | URL-safe slug |
| `--description <string>` | Yes | — | SEO meta description |
| `--date <YYYY-MM-DD>` | No | Today's date | Publication date |
| `--time-to-read <number>` | No | `5` | Estimated reading time in minutes |
| `--author <string>` | Yes | — | Author slug (must match an existing author) |
| `--category <string>` | Yes | — | Category name (must match an existing category directory) |
| `--featured` | No | `false` | Mark as featured post (boolean flag, presence = true) |
| `--cover <path>` | No | — | Path to cover image file. Copied to `static/images/blog/<slug>/cover.png` |
| `--import-notion <path>` | No | — | Path to Notion export .zip file. Auto-chains into the Notion import flow after blog creation |
| `--force` | No | `false` | Skip confirmation and Notion import prompts |

### Files Created

- `src/routes/blog/post/<slug>/+page.markdoc` — Blog post with frontmatter and template body
- `static/images/blog/<slug>/` — Image directory
- `static/images/blog/<slug>/cover.png` — Cover image (if `--cover` provided)

### Frontmatter Schema

```yaml
---
layout: post
title: <title>
description: <description>
date: <YYYY-MM-DD>
cover: /images/blog/<slug>/cover.png
timeToRead: <minutes>
author: <author-slug>
category: <category>
featured: <true|false>
---
```

### Chaining Behavior

After successful creation, the command offers to import content from Notion:

| Scenario | Behavior |
|----------|----------|
| `--import-notion <zip>` provided | Automatically imports from the given zip (no prompt) |
| `--force` without `--import-notion` | Skips the Notion import prompt entirely |
| Interactive mode (no flags) | Prompts "Would you like to import content from Notion?" |

When Notion import runs (either via `--import-notion` or interactive "Yes"), the new blog slug is pre-selected so the user doesn't have to pick it again. Sanitize runs automatically at the end of the Notion import.

### Examples

**Interactive:**
```bash
npx appwrite-internal-cli blog create-blog
```

**Non-interactive (minimal):**
```bash
npx appwrite-internal-cli blog create-blog \
  --title "Getting Started with Appwrite" \
  --description "Learn how to set up Appwrite in 5 minutes" \
  --author john-doe \
  --category tutorials \
  --force
```

**Non-interactive with Notion import:**
```bash
npx appwrite-internal-cli blog create-blog \
  --title "Getting Started with Appwrite" \
  --description "Learn how to set up Appwrite in 5 minutes" \
  --author john-doe \
  --category tutorials \
  --cover ./cover.png \
  --import-notion ./notion-export.zip \
  --force
```

**Non-interactive with all options:**
```bash
npx appwrite-internal-cli blog create-blog \
  --title "Getting Started with Appwrite" \
  --slug "getting-started-appwrite" \
  --description "Learn how to set up Appwrite in 5 minutes" \
  --date "2025-06-15" \
  --time-to-read 8 \
  --author john-doe \
  --category tutorials \
  --featured \
  --cover ./cover.png \
  --force
```

### Validation

- **title**: Required, non-empty
- **slug**: Must be unique (no existing post directory), lowercase alphanumeric and hyphens only
- **description**: Required, non-empty
- **author**: Must be a valid author slug string
- **category**: Must be a valid category string

---

## `blog import-notion`

Import a Notion export (.zip) into an existing blog post, replacing the markdoc body content while preserving frontmatter.

### Flags

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--zip <path>` | Yes* | — | Path to Notion export .zip file |
| `--slug <string>` | Yes* | — | Target blog post slug to import into |
| `--md-file <index>` | No | `0` | Zero-based index of the markdown file to use if the export contains multiple. Defaults to first file found |

*Required for non-interactive mode. In interactive mode, the user is prompted.

### Processing Pipeline

1. **Extract zip** — Extracts to a temp directory, including nested zips
2. **Select markdown** — Finds `.md`/`.markdown` files in the export
3. **Strip frontmatter** — Removes YAML frontmatter, title headings, and key-value metadata from the top of the document
4. **Copy images** — Copies all referenced images and extra images from the export to `static/images/blog/<slug>/`
5. **Rewrite paths** — Rewrites all image references to `/images/blog/<slug>/<filename>`
6. **Update markdoc** — Replaces the body of `+page.markdoc` (after frontmatter) with the processed content
7. **Auto-sanitize** — Automatically runs the sanitize command (fix headings, curly quotes) on the imported blog

### Image Handling

- Images referenced in markdown (`![alt](path)` and `<img src="...">`) are resolved against the export directory
- The CLI attempts multiple resolution strategies: exact path, decoded URI, basename match, flexible stem match
- All images from the export are copied to `static/images/blog/<slug>/`, even unreferenced ones
- Image paths in the markdown are rewritten to `/images/blog/<slug>/<filename>`

### Examples

**Interactive:**
```bash
npx appwrite-internal-cli blog import-notion
```

**Non-interactive:**
```bash
npx appwrite-internal-cli blog import-notion \
  --zip ./notion-export.zip \
  --slug my-blog-post
```

**Non-interactive with specific markdown file:**
```bash
npx appwrite-internal-cli blog import-notion \
  --zip ./notion-export.zip \
  --slug my-blog-post \
  --md-file 2
```

### Behavior Notes

- When `--zip` is provided without `--md-file` and multiple markdown files exist, the first file is used automatically (with a warning printed to stdout)
- The command always auto-runs sanitize at the end — there is no flag to skip it
- When called from `blog create-blog` (via `--import-notion` or interactive prompt), the slug is pre-selected and the readline lifecycle is managed by the parent command

---

## `blog sanitize`

Fix heading levels and curly/smart quotes in a blog post's markdoc file.

### Flags

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--slug <string>` | Yes* | — | Blog post slug to sanitize |

*Required for non-interactive mode. In interactive mode, the user is prompted with a searchable list.

### What It Fixes

1. **Curly quotes** — Replaces Unicode smart quotes (`\u2018`, `\u2019`, `\u201C`, `\u201D`, etc.) with straight ASCII quotes (`'`, `"`)
2. **Heading levels** — If the first heading in the body is `##` or deeper, promotes all headings by one level (e.g., `##` becomes `#`, `###` becomes `##`)

### Examples

**Interactive:**
```bash
npx appwrite-internal-cli blog sanitize
```

**Non-interactive:**
```bash
npx appwrite-internal-cli blog sanitize --slug my-blog-post
```

### Programmatic API

The sanitize module exports `sanitizeSlug(slug)` for use by other commands:

```javascript
import { sanitizeSlug } from "./sanitize.js";
sanitizeSlug("my-blog-post");
// Returns: { ok: boolean, quotesChanged: boolean, headingsChanged: boolean }
```

---

## APIs

The API commands read the website source tree and return structured JSON to stdout. They take no flags, require no interaction, and produce no side effects. Output is always a JSON array, pretty-printed with 2-space indentation.

### `blog get-authors`

Returns all authors sorted alphabetically by `name`.

```bash
npx appwrite-internal-cli blog get-authors
```

#### Output Format

```json
[
  {
    "slug": "string",
    "name": "string",
    "role": "string",
    "bio": "string",
    "avatar": "string",
    "twitter": "string",
    "github": "string",
    "linkedin": "string"
  }
]
```

#### Field Reference

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `slug` | `string` | Unique identifier, derived from the author's directory name. Used as the foreign key in blog posts (`author` field). | `"eldad-fux"` |
| `name` | `string` | Author's display name, as written in frontmatter. | `"Eldad Fux"` |
| `role` | `string` | Job title or role at the company. | `"Founder and CEO"` |
| `bio` | `string` | Short biography (1-2 sentences). Empty string `""` if not set. | `"Appwrite's first open-source contributor."` |
| `avatar` | `string` | Absolute path to the avatar image relative to the `static/` directory. Always follows the pattern `/images/avatars/<filename>.png`. | `"/images/avatars/eldad.png"` |
| `twitter` | `string` | Full Twitter/X profile URL. Empty string `""` if not set. | `"https://x.com/eldadfux"` |
| `github` | `string` | Full GitHub profile URL. Empty string `""` if not set. | `"https://github.com/eldadfux"` |
| `linkedin` | `string` | Full LinkedIn profile URL. Empty string `""` if not set. | `"https://www.linkedin.com/in/eldadfux"` |

#### Notes

- Every field is always present in every object (no missing keys). Optional social links are `""` (empty string), never `null` or absent.
- The array is sorted alphabetically by `name` (case-sensitive, using `String.prototype.localeCompare`).
- Source directory: `src/routes/blog/author/*/+page.markdoc`
- Directories without a `+page.markdoc` file are skipped.

#### Example Output

```json
[
  {
    "slug": "atharva",
    "name": "Atharva Deosthale",
    "role": "Developer Advocate",
    "bio": "Developer & Content Creator",
    "avatar": "/images/avatars/atharva.png",
    "twitter": "https://x.com/atharvabuilds",
    "github": "https://github.com/atharvadeosthale",
    "linkedin": "https://www.linkedin.com/in/atharvadeosthale/"
  },
  {
    "slug": "eldad-fux",
    "name": "Eldad Fux",
    "role": "Founder and CEO",
    "bio": "Appwrite's first open-source contributor.",
    "avatar": "/images/avatars/eldad.png",
    "twitter": "https://twitter.com/eldadfux",
    "github": "https://github.com/eldadfux",
    "linkedin": "https://www.linkedin.com/in/eldadfux"
  }
]
```

---

### `blog get-categories`

Returns all categories sorted alphabetically by `name`.

```bash
npx appwrite-internal-cli blog get-categories
```

#### Output Format

```json
[
  {
    "slug": "string",
    "name": "string",
    "description": "string"
  }
]
```

#### Field Reference

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `slug` | `string` | Unique identifier, derived from the category's directory name. This is the value used in blog post frontmatter (`category` field). | `"tutorial"` |
| `name` | `string` | Human-readable display name from frontmatter. Falls back to `slug` if frontmatter is missing. | `"Tutorial"` |
| `description` | `string` | Category description from frontmatter. Empty string `""` if not set. | `"Learn how to implement Appwrite into your projects."` |

#### Notes

- Every field is always present in every object. `description` is `""` if not set, never `null` or absent.
- The array is sorted alphabetically by `name`.
- Categories without a `+page.markdoc` file are still included (with `name` defaulting to `slug` and `description` to `""`).
- Source directory: `src/routes/blog/category/*/+page.markdoc`
- Hidden directories (starting with `.`) are excluded.

#### Example Output

```json
[
  {
    "slug": "announcement",
    "name": "Announcement",
    "description": "Get all the major annoucnements in one place."
  },
  {
    "slug": "tutorial",
    "name": "Tutorial",
    "description": "Learn how to implement Appwrite into your projects."
  }
]
```

---

### `blog get-blogs`

Returns all blog posts sorted by `date` descending (newest first).

```bash
npx appwrite-internal-cli blog get-blogs
```

#### Output Format

```json
[
  {
    "slug": "string",
    "title": "string",
    "description": "string",
    "date": "string",
    "cover": "string",
    "timeToRead": "number",
    "author": "string",
    "category": "string",
    "featured": "boolean"
  }
]
```

#### Field Reference

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `slug` | `string` | Unique identifier, derived from the post's directory name. Used in the URL path `/blog/post/<slug>`. | `"ai-crystal-ball"` |
| `title` | `string` | Blog post title. May contain special characters, colons, quotes. Falls back to `slug` if missing from frontmatter. | `"Predicting your developer destiny: how I built the AI Crystal Ball"` |
| `description` | `string` | SEO meta description. Empty string `""` if not set. | `"How I used Appwrite, OpenAI, GitHub, and SvelteKit to develop an AI prank app."` |
| `date` | `string` | Publication date in `YYYY-MM-DD` format. Empty string `""` if not set. Used for sorting (newest first). | `"2024-05-10"` |
| `cover` | `string` | Absolute path to the cover image relative to the `static/` directory. Empty string `""` if not set. | `"/images/blog/ai-crystal-ball/cover.png"` |
| `timeToRead` | `number` | Estimated reading time in minutes. `0` if not set or not a valid number. | `9` |
| `author` | `string` | Author slug. References an author from `get-authors` by the `slug` field. Empty string `""` if not set. | `"aditya-oberai"` |
| `category` | `string` | Category slug. References a category from `get-categories` by the `slug` field. Empty string `""` if not set. | `"tutorial"` |
| `featured` | `boolean` | Whether the post is marked as featured. `false` if the field is absent from frontmatter or set to `false`. | `false` |

#### Notes

- Every field is always present in every object. Strings default to `""`, numbers to `0`, booleans to `false`. No field is ever `null` or absent.
- The array is sorted by `date` descending (newest first). Posts with empty dates sort to the end.
- The `author` field is a slug that can be joined against the `slug` field in the `get-authors` output to get the full author object.
- The `category` field is a slug that can be joined against the `slug` field in the `get-categories` output to get the full category object.
- Source directory: `src/routes/blog/post/*/+page.markdoc`
- Directories without a `+page.markdoc` file are skipped.
- Blog post body content is **not** included in the output — only frontmatter metadata.

#### Example Output

```json
[
  {
    "slug": "announcing-appwrite-education-program",
    "title": "Announcing the Appwrite Education program in collaboration with GitHub",
    "description": "Appwrite partners up with GitHub for the Appwrite Education program. Together we enable future developers.",
    "date": "2024-11-12",
    "cover": "/images/blog/education-program.png",
    "timeToRead": 4,
    "author": "aditya-oberai",
    "category": "announcement",
    "featured": false
  },
  {
    "slug": "ai-crystal-ball",
    "title": "Predicting your developer destiny: how I built the AI Crystal Ball",
    "description": "How I used Appwrite, OpenAI, GitHub, and SvelteKit to develop an AI prank app.",
    "date": "2024-05-10",
    "cover": "/images/blog/ai-crystal-ball/cover.png",
    "timeToRead": 9,
    "author": "aditya-oberai",
    "category": "tutorial",
    "featured": false
  }
]
```

---

### Joining API Data

The three APIs are designed to be joined together via slug references:

```
get-blogs[].author  ──►  get-authors[].slug
get-blogs[].category  ──►  get-categories[].slug
```

**Example: Resolving a blog's author and category**

```javascript
const authors = JSON.parse(execSync("npx appwrite-internal-cli blog get-authors"));
const categories = JSON.parse(execSync("npx appwrite-internal-cli blog get-categories"));
const blogs = JSON.parse(execSync("npx appwrite-internal-cli blog get-blogs"));

const authorMap = Object.fromEntries(authors.map(a => [a.slug, a]));
const categoryMap = Object.fromEntries(categories.map(c => [c.slug, c]));

for (const blog of blogs) {
  const author = authorMap[blog.author];    // full author object
  const category = categoryMap[blog.category]; // full category object
  console.log(`${blog.title} by ${author?.name} in ${category?.name}`);
}
```

---

## Programmatic Usage (Importing as Modules)

Each command exports a `run*` function that accepts an options object, and the API module exports pure data-fetching functions, making them callable from other Node.js code:

```javascript
import { runCreateAuthor } from "./create-author.js";
import { runCreateBlog } from "./create-blog.js";
import { runImportNotion } from "./import-notion.js";
import { runSanitize } from "./sanitize.js";
import { getAuthors, getCategories, getBlogs } from "./application.js";
```

### `runCreateAuthor(opts)`

```javascript
await runCreateAuthor({
  name: "Jane Doe",
  role: "Developer Advocate",
  bio: "Optional bio text",          // optional
  slug: "jane-doe",                  // optional, auto-generated from name
  avatar: "/path/to/avatar.png",     // optional
  twitter: "https://x.com/jane",     // optional
  github: "https://github.com/jane", // optional
  linkedin: "https://linkedin.com/in/jane", // optional
  force: true,                       // skip confirmation
});
```

### `runCreateBlog(opts)`

```javascript
await runCreateBlog({
  title: "My Blog Post",
  description: "SEO description",
  author: "jane-doe",
  category: "tutorials",
  slug: "my-blog-post",             // optional, auto-generated from title
  date: "2025-06-15",               // optional, defaults to today
  timeToRead: "8",                  // optional, defaults to "5"
  featured: true,                   // optional, defaults to false
  cover: "/path/to/cover.png",      // optional
  importNotion: "/path/to/export.zip", // optional, chains Notion import
  force: true,                      // skip confirmations
});
```

### `runImportNotion(opts)`

```javascript
await runImportNotion({
  zip: "/path/to/notion-export.zip",  // required for non-interactive
  slug: "my-blog-post",               // required for non-interactive
  mdFile: 0,                          // optional, 0-based index
  skipClose: true,                    // optional, for chaining (caller manages readline)
});
```

### `runSanitize(opts)`

```javascript
await runSanitize({
  slug: "my-blog-post",  // required for non-interactive
});
```

### `getAuthors()`, `getCategories()`, `getBlogs()`

Pure synchronous functions that read the filesystem and return arrays. No side effects, no stdout output.

```javascript
import { getAuthors, getCategories, getBlogs } from "./application.js";

const authors = getAuthors();       // Author[]
const categories = getCategories(); // Category[]
const blogs = getBlogs();           // Blog[]
```

See the [APIs](#apis) section above for the exact return type schemas.

---

## Full Workflow Chain

The commands can be chained into a complete blog creation pipeline:

```
create-blog ──► import-notion ──► sanitize (auto)
```

### Automated Full Pipeline

```bash
npx appwrite-internal-cli blog create-blog \
  --title "My New Post" \
  --description "A great article about things" \
  --author jane-doe \
  --category engineering \
  --cover ./cover.png \
  --import-notion ./notion-export.zip \
  --force
```

This single command will:
1. Create the blog post directory and markdoc file
2. Copy the cover image
3. Import the Notion export (extract zip, process markdown, copy images, rewrite paths)
4. Auto-sanitize headings and quotes

### Manual Step-by-Step

```bash
# Step 1: Create the blog
npx appwrite-internal-cli blog create-blog \
  --title "My New Post" \
  --description "A great article" \
  --author jane-doe \
  --category engineering \
  --force

# Step 2: Import Notion content
npx appwrite-internal-cli blog import-notion \
  --zip ./notion-export.zip \
  --slug my-new-post

# Step 3: Sanitize (optional, already runs at end of import-notion)
npx appwrite-internal-cli blog sanitize --slug my-new-post
```

---

## Directory Structure

The CLI expects and creates files in the following structure relative to the current working directory:

```
.
├── src/routes/blog/
│   ├── author/
│   │   └── <author-slug>/
│   │       └── +page.markdoc        # Author profile
│   ├── category/
│   │   └── <category-name>/         # Category directories (read-only)
│   └── post/
│       └── <post-slug>/
│           └── +page.markdoc        # Blog post content
└── static/images/
    ├── avatars/
    │   └── <author-slug>.png        # Author avatars
    └── blog/
        └── <post-slug>/
            ├── cover.png            # Cover image
            └── *.png/jpg/gif/...    # Content images
```

---

## CI/CD Integration

### Environment Requirements

- Node.js >= 18
- Must be run from the website project root (where `src/routes/blog/` exists)
- No environment variables required
- No authentication required

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (missing required flags, validation failure, file not found) |

### Example: GitHub Actions

```yaml
- name: Create blog post from Notion
  run: |
    npx appwrite-internal-cli blog create-blog \
      --title "${{ inputs.title }}" \
      --description "${{ inputs.description }}" \
      --author "${{ inputs.author }}" \
      --category "${{ inputs.category }}" \
      --date "${{ inputs.date }}" \
      --import-notion "${{ inputs.notion_zip }}" \
      --force
```

### Stdout

All commands write progress and status information to stdout. Key output includes:
- File paths of created/modified files
- Image copy confirmations
- Sanitization results (quotes replaced, headings changed)

Errors are written to stdout (not stderr) prefixed with color codes. In automation contexts, exit code is the reliable indicator of success/failure.
