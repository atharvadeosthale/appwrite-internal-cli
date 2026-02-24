import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import {
  COLORS,
  printHeader,
  selectFromListFilter,
  closeReadline,
} from "./utils.js";

const ROOT_DIR = process.cwd();

function getBlogs() {
  const postsDir = path.join(ROOT_DIR, "src", "routes", "blog", "post");
  const options = [];
  if (!fs.existsSync(postsDir)) return options;
  const entries = fs.readdirSync(postsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const markdocPath = path.join(postsDir, slug, "+page.markdoc");
    let label = slug;
    if (fs.existsSync(markdocPath)) {
      const content = fs.readFileSync(markdocPath, "utf8");
      const m = content.match(/^---\n([\s\S]*?)\n---/);
      if (m) {
        const titleMatch = m[1].match(/title:\s*(.+)/);
        if (titleMatch) label = `${titleMatch[1].trim()} (${slug})`;
      }
    }
    options.push({ label, value: slug });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function sanitizeQuotes(text) {
  return text
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"');
}

function countCurlyQuotes(text) {
  const left = (text.match(/[\u2018\u2019\u201B\u2032]/g) || []).length;
  const right = (text.match(/[\u201C\u201D\u201F\u2033]/g) || []).length;
  return left + right;
}

function fixHeadings(markdocBody) {
  const lines = markdocBody.split(/\r?\n/);
  let insideFence = false;
  let firstHeadingLevel = 0;

  const isFence = (line) => /^\s*```/.test(line);
  const headingMatch = (line) => {
    // Accept headings with or without a space after hashes
    const m = line.match(/^\s*(#{1,6})\s*(\S.*)$/);
    return m ? { level: m[1].length, text: m[2] } : null;
  };

  for (const line of lines) {
    if (isFence(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) continue;
    const hm = headingMatch(line);
    if (hm) {
      firstHeadingLevel = hm.level;
      break;
    }
  }

  console.log(
    `${COLORS.dim}[SAN] First heading level detected: ${
      firstHeadingLevel || "none"
    }${COLORS.reset}`
  );

  if (firstHeadingLevel === 0 || firstHeadingLevel === 1)
    return { updated: markdocBody, changed: false };

  let changes = 0;
  const adjusted = lines.map((line) => {
    if (isFence(line)) {
      insideFence = !insideFence;
      return line;
    }
    if (insideFence) return line;
    const m = line.match(/^\s*(#{2,6})\s*(\S.*)$/);
    if (!m) return line;
    const newHashes = m[1].slice(0, -1); // promote by one level (Hn->Hn-1)
    changes++;
    return `${newHashes} ${m[2]}`;
  });

  console.log(
    `${COLORS.dim}[SAN] Headings shifted by one level on ${changes} line(s)${COLORS.reset}`
  );

  return { updated: adjusted.join("\n"), changed: changes > 0 };
}

function getFirstHeadingLevel(markdocBody) {
  const lines = markdocBody.split(/\r?\n/);
  let insideFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) continue;
    const m = line.match(/^\s*(#{1,6})\s*(\S.*)$/);
    if (m) return m[1].length;
  }
  return 0;
}

function sanitizeMarkdoc(markdocPath) {
  console.log(`${COLORS.dim}[SAN] Reading: ${markdocPath}${COLORS.reset}`);
  const content = fs.readFileSync(markdocPath, "utf8");
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    console.log(
      `${COLORS.yellow}[SAN] No frontmatter block found${COLORS.reset}`
    );
    return { ok: false };
  }
  const frontmatterBlock = `---\n${m[1]}\n---`;
  const body = m[2];

  const beforeLevel = getFirstHeadingLevel(body);
  const curlyBefore = countCurlyQuotes(body);

  const quotesFixed = sanitizeQuotes(body);
  const { updated: headingsFixed, changed: headingsChanged } =
    fixHeadings(quotesFixed);

  const curlyAfter = countCurlyQuotes(headingsFixed);
  const quotesChanged = quotesFixed !== body;

  const updated = `${frontmatterBlock}\n${headingsFixed}`;
  fs.writeFileSync(markdocPath, updated);

  console.log(
    `${COLORS.dim}[SAN] Quotes replaced: ${
      quotesChanged ? curlyBefore - curlyAfter : 0
    }; First heading was: ${
      beforeLevel || "none"
    }; Headings changed: ${headingsChanged}${COLORS.reset}`
  );

  return { ok: true, quotesChanged, headingsChanged };
}

export function sanitizeSlug(slug) {
  const markdocPath = path.join(
    ROOT_DIR,
    "src",
    "routes",
    "blog",
    "post",
    slug,
    "+page.markdoc"
  );
  if (!fs.existsSync(markdocPath)) {
    console.log(
      `${COLORS.yellow}[SAN] Markdoc not found for slug ${slug}${COLORS.reset}`
    );
    return { ok: false };
  }
  return sanitizeMarkdoc(markdocPath);
}

async function main() {
  printHeader("SANITIZE BLOG", "Fix headings and curly quotes in a blog post");
  try {
    const blogs = getBlogs();
    if (blogs.length === 0) {
      console.log(`${COLORS.red}No blogs found to sanitize${COLORS.reset}`);
      return;
    }
    const slug = await selectFromListFilter(
      "Select a blog to sanitize:",
      blogs
    );
    const markdocPath = path.join(
      ROOT_DIR,
      "src",
      "routes",
      "blog",
      "post",
      slug,
      "+page.markdoc"
    );
    if (!fs.existsSync(markdocPath)) {
      console.log(`${COLORS.red}Markdoc not found for ${slug}${COLORS.reset}`);
      return;
    }
    const res = sanitizeMarkdoc(markdocPath);
    if (res.ok) {
      console.log(
        `${COLORS.pink}${COLORS.bright}✓ Sanitized${COLORS.reset} ${markdocPath}`
      );
    } else {
      console.log(`${COLORS.red}Failed to parse markdoc${COLORS.reset}`);
    }
  } catch (e) {
    console.log(`${COLORS.red}Error: ${e.message}${COLORS.reset}`);
  }
  closeReadline();
}

export async function runSanitize() {
  await main();
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main();
}
