import fs from "fs";
import path from "path";
import os from "os";
import extract from "extract-zip";
import { pathToFileURL } from "url";
import {
  COLORS,
  printHeader,
  question,
  selectFromList,
  selectFromListFilter,
  closeReadline,
} from "./utils.js";

const ROOT_DIR = process.cwd();

function cleanDraggedPath(input) {
  return input
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\ /g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

async function promptZipPath() {
  let zipPath = "";
  while (true) {
    const input = await question("Notion export .zip path: ");
    if (!input) continue;
    zipPath = cleanDraggedPath(input);
    if (fs.existsSync(zipPath) && zipPath.toLowerCase().endsWith(".zip")) {
      return zipPath;
    }
    console.log(
      `${COLORS.red}Invalid zip path. Please try again.${COLORS.reset}`
    );
  }
}

async function extractZip(zipPath) {
  const tempDir = path.join(
    os.tmpdir(),
    `appwrite-notion-import-${Date.now()}`
  );
  fs.mkdirSync(tempDir, { recursive: true });
  await extract(zipPath, { dir: tempDir });
  return tempDir;
}

function listMarkdownFiles(rootDir) {
  const results = [];
  const stack = [rootDir];
  const isMd = (name) => {
    const lower = name.toLowerCase();
    return lower.endsWith(".md") || lower.endsWith(".markdown");
  };
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "__MACOSX") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && isMd(entry.name)) {
        results.push(full);
      }
    }
  }
  return results;
}

function listZipFiles(rootDir) {
  const results = [];
  const stack = [rootDir];
  const isZip = (name) => name.toLowerCase().endsWith(".zip");
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "__MACOSX") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && isZip(entry.name)) {
        results.push(full);
      }
    }
  }
  return results;
}

function listAllImageFiles(rootDir) {
  const results = [];
  const stack = [rootDir];
  const exts = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "__MACOSX") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (
        entry.isFile() &&
        exts.has(path.extname(entry.name).toLowerCase())
      ) {
        results.push(full);
      }
    }
  }
  return results;
}

async function selectMarkdownFile(extractedDir) {
  const files = listMarkdownFiles(extractedDir);
  if (files.length === 0) {
    throw new Error("No markdown files found in the Notion export");
  }
  console.log(`${COLORS.dim}Markdown files discovered:${COLORS.reset}`);
  for (const f of files) {
    console.log(
      `${COLORS.dim}  - ${path.relative(extractedDir, f)}${COLORS.reset}`
    );
  }
  if (files.length === 1) return files[0];
  const options = files.map((f) => ({
    label: path.relative(extractedDir, f),
    value: f,
  }));
  const selected = await selectFromList(
    "Select markdown file to import:",
    options
  );
  return selected;
}

function stripTitleAndFrontmatter(markdown) {
  const lines = markdown.split(/\r?\n/);
  let i = 0;

  const isYamlDelimiter = (line) => line.trim() === "---";
  const isHeading = (line) => /^\s*#{1,6}\s+/.test(line);
  const isKeyValue = (line) => /^[A-Za-z][A-Za-z0-9 _-]*\s*:\s*.+$/.test(line);

  // Repeat removal while the top keeps matching blocks
  let changed = true;
  while (changed) {
    changed = false;

    // Skip leading blank lines
    while (i < lines.length && lines[i].trim() === "") i++;

    // YAML frontmatter blocks at top (can be multiple)
    while (i < lines.length && isYamlDelimiter(lines[i])) {
      changed = true;
      i++; // skip opening ---
      while (i < lines.length && !isYamlDelimiter(lines[i])) i++;
      if (i < lines.length && isYamlDelimiter(lines[i])) i++; // skip closing ---
      while (i < lines.length && lines[i].trim() === "") i++; // following blanks
    }

    // Heading lines at the very top (can be multiple)
    let removedHeading = false;
    while (i < lines.length && isHeading(lines[i])) {
      changed = true;
      removedHeading = true;
      i++;
    }
    if (removedHeading) {
      while (i < lines.length && lines[i].trim() === "") i++;
    }

    // Key: value lines block at the top (can be multiple lines)
    let startKv = i;
    let anyKv = false;
    while (startKv < lines.length && lines[startKv].trim() === "") startKv++;
    while (startKv < lines.length && isKeyValue(lines[startKv])) {
      anyKv = true;
      startKv++;
    }
    if (anyKv) {
      changed = true;
      i = startKv;
      while (i < lines.length && lines[i].trim() === "") i++;
    }
  }

  return lines.slice(i).join("\n").trimStart();
}

function collectImageRefs(markdown) {
  const refs = new Set();
  const mdImg = /!\[[^\]]*\]\(([^)]+)\)/g; // capture inside (...) including spaces
  const htmlImg = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = mdImg.exec(markdown)) !== null) {
    let inner = m[1].trim();
    if (inner.startsWith("<") && inner.endsWith(">"))
      inner = inner.slice(1, -1).trim();
    // Strip optional title: url "title" or url 'title'
    inner = inner
      .replace(/\s+"[\s\S]*$/, "")
      .replace(/\s+'[\s\S]*$/, "")
      .trim();
    if (!/^https?:\/\//i.test(inner) && !/^data:/i.test(inner)) refs.add(inner);
  }
  while ((m = htmlImg.exec(markdown)) !== null) {
    const url = m[1];
    if (!/^https?:\/\//i.test(url) && !/^data:/i.test(url)) refs.add(url);
  }
  return Array.from(refs);
}

function generateRefVariants(url) {
  const variants = new Set();
  const add = (v) => {
    if (v) variants.add(v);
  };
  add(url);
  try {
    add(decodeURI(url));
  } catch {}
  try {
    add(decodeURIComponent(url));
  } catch {}
  const noQ = url.replace(/[?#][\s\S]*$/, "");
  add(noQ);
  try {
    add(decodeURI(noQ));
  } catch {}
  try {
    add(decodeURIComponent(noQ));
  } catch {}
  return Array.from(variants);
}

function resolveMapping(mapping, url) {
  const candidates = generateRefVariants(url);
  for (const c of candidates) {
    const hit = mapping.get(c);
    if (hit) return hit;
  }
  return undefined;
}

function findFileByBasename(rootDir, basename) {
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name === basename) {
        return full;
      }
    }
  }
  return null;
}

function decodeMaybe(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function stripCopySuffix(stem) {
  return stem.replace(/\s*\(\d+\)$/, "");
}

function findFileByStemFlexible(rootDir, targetStem) {
  const targetNorm = stripCopySuffix(decodeMaybe(targetStem));
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        const fileStem = path.basename(entry.name, path.extname(entry.name));
        const fileNorm = stripCopySuffix(decodeMaybe(fileStem));
        if (
          fileNorm === targetNorm ||
          fileNorm.startsWith(targetNorm) ||
          targetNorm.startsWith(fileNorm)
        ) {
          return full;
        }
      }
    }
  }
  return null;
}

function ensureUniqueBasename(targetDir, basename) {
  let name = basename;
  const ext = path.extname(basename);
  const stem = path.basename(basename, ext);
  let counter = 1;
  while (fs.existsSync(path.join(targetDir, name))) {
    name = `${stem}-${counter}${ext}`;
    counter++;
  }
  return name;
}

function rewriteMarkdownPaths(markdown, mapping) {
  // Markdown images: rebuild (url ["title"]) preserving title
  markdown = markdown.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (full, inner) => {
    let original = inner.trim();
    let title = "";
    if (original.startsWith("<") && original.endsWith(">"))
      original = original.slice(1, -1).trim();
    // Extract optional title ("..." or '\''...') at the end
    const titleMatch = original.match(/\s+("[\s\S]*"|'[\s\S]*')\s*$/);
    if (titleMatch) {
      title = " " + titleMatch[1];
      original = original.slice(0, titleMatch.index).trim();
    }
    const mapped = resolveMapping(mapping, original);
    if (!mapped) return full;
    // Preserve alt text from original by reconstructing with regex
    const altMatch = full.match(/^!\[([^\]]*)\]/);
    const alt = altMatch ? altMatch[1] : "";
    return `![${alt}](${mapped}${title})`;
  });
  // HTML <img>
  markdown = markdown.replace(
    /(<img[^>]+src=["'])([^"']+)(["'][^>]*>)/gi,
    (full, a, url, b) => {
      const mapped = resolveMapping(mapping, url);
      return mapped ? `${a}${mapped}${b}` : full;
    }
  );
  // Remove a single extra ".ext)" that appears immediately after an image link
  markdown = markdown.replace(
    /(\!\[[^\]]*\]\([^\)]+\))\s*\.(?:png|jpe?g|gif|webp|svg)\)/gi,
    "$1)"
  );
  // Collapse double closing parenthesis after an image link
  markdown = markdown.replace(/(\!\[[^\]]*\]\([^\)]*\))\)/g, "$1");
  return markdown;
}

function rewriteMarkdownPathsSimple(markdown, slug) {
  // Markdown images
  markdown = markdown.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (full, alt, inner) => {
      let body = inner;
      let title = "";
      const titleMatch = body.match(/\s+("[\s\S]*"|'[\s\S]*')\s*$/);
      if (titleMatch) {
        title = " " + titleMatch[1];
        body = body.slice(0, titleMatch.index).trim();
      }
      body = body.trim().replace(/^<|>$/g, "");
      const base = path.basename(body.replace(/[?#][\s\S]*$/, ""));
      return `![${alt}](/images/blog/${slug}/${base}${title})`;
    }
  );
  // HTML <img>
  markdown = markdown.replace(
    /(<img[^>]*\bsrc=["'])([^"']+)(["'])/gi,
    (full, pre, url, q) => {
      const base = path.basename(url.replace(/[?#][\s\S]*$/, ""));
      return `${pre}/images/blog/${slug}/${base}${q}`;
    }
  );
  return markdown;
}

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

async function selectBlogSlug() {
  const blogs = getBlogs();
  if (blogs.length === 0) {
    throw new Error("No existing blogs found at src/routes/blog/post");
  }
  const slug = await selectFromListFilter(
    "Select a blog to import into:",
    blogs
  );
  return slug;
}

function updateMarkdocBody(slug, newBody) {
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
    throw new Error(`Markdoc not found for slug ${slug} at ${markdocPath}`);
  }
  const content = fs.readFileSync(markdocPath, "utf8");
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) {
    throw new Error("Invalid Markdoc file: missing frontmatter");
  }
  const fmBlock = fmMatch[0];
  const updated = `${fmBlock}\n${newBody.trim()}\n`;
  fs.writeFileSync(markdocPath, updated);
  return markdocPath;
}

async function main({
  preSelectedSlug = null,
  preSelectedZip = null,
  preSelectedMdFile = null,
  skipClose = false,
} = {}) {
  printHeader(
    "NOTION IMPORTER",
    "Import a Notion export into an existing blog post"
  );

  try {
    let zipPath;
    if (preSelectedZip) {
      if (!fs.existsSync(preSelectedZip) || !preSelectedZip.toLowerCase().endsWith(".zip")) {
        throw new Error(`Invalid zip path: ${preSelectedZip}`);
      }
      zipPath = preSelectedZip;
    } else {
      zipPath = await promptZipPath();
    }
    console.log(`\n${COLORS.dim}Zip: ${zipPath}${COLORS.reset}`);
    console.log(`${COLORS.dim}Extracting zip...${COLORS.reset}`);
    const extractedDir = await extractZip(zipPath);
    console.log(`${COLORS.dim}Extracted to: ${extractedDir}${COLORS.reset}`);

    // Log top-level entries for debugging
    try {
      const topEntries = fs
        .readdirSync(extractedDir, { withFileTypes: true })
        .filter((e) => !e.name.startsWith(".") && e.name !== "__MACOSX")
        .map((e) => `${e.isDirectory() ? "dir " : "file"} ${e.name}`);
      console.log(`${COLORS.dim}Top-level entries:${COLORS.reset}`);
      for (const line of topEntries)
        console.log(`${COLORS.dim}  - ${line}${COLORS.reset}`);
    } catch {}

    // If there are nested zips (Notion sometimes nests parts), extract them into place
    const nestedZips = listZipFiles(extractedDir);
    if (nestedZips.length > 0) {
      console.log(`${COLORS.dim}Nested zip(s) found:${COLORS.reset}`);
      for (const z of nestedZips)
        console.log(`${COLORS.dim}  - ${z}${COLORS.reset}`);
      for (const z of nestedZips) {
        const targetDir = path.dirname(z);
        console.log(
          `${COLORS.dim}Extracting nested zip into:${COLORS.reset} ${targetDir}`
        );
        await extract(z, { dir: targetDir });
      }
    }

    // Prefer the first top-level folder if present (zip -> folder -> md)
    let searchRoot = extractedDir;
    try {
      const top = fs
        .readdirSync(extractedDir, { withFileTypes: true })
        .filter(
          (e) =>
            e.isDirectory() && !e.name.startsWith(".") && e.name !== "__MACOSX"
        )
        .map((e) => path.join(extractedDir, e.name));
      const hasMdAtRoot = listMarkdownFiles(extractedDir).length > 0;
      if (!hasMdAtRoot && top.length === 1) {
        searchRoot = top[0];
      }
    } catch {}

    let mdFile;
    if (preSelectedMdFile !== null) {
      const files = listMarkdownFiles(searchRoot);
      if (files.length === 0) {
        throw new Error("No markdown files found in the Notion export");
      }
      const idx = parseInt(preSelectedMdFile, 10);
      if (isNaN(idx) || idx < 0 || idx >= files.length) {
        throw new Error(
          `Invalid --md-file index ${preSelectedMdFile}. Found ${files.length} file(s) (0-${files.length - 1}).`
        );
      }
      mdFile = files[idx];
    } else if (preSelectedZip) {
      // Non-interactive: auto-select first markdown file
      const files = listMarkdownFiles(searchRoot);
      if (files.length === 0) {
        throw new Error("No markdown files found in the Notion export");
      }
      mdFile = files[0];
      if (files.length > 1) {
        console.log(
          `${COLORS.yellow}Multiple markdown files found, using first: ${path.relative(searchRoot, mdFile)}${COLORS.reset}`
        );
      }
    } else {
      mdFile = await selectMarkdownFile(searchRoot);
    }
    console.log(`${COLORS.dim}Selected markdown: ${mdFile}${COLORS.reset}`);
    const rawMd = fs.readFileSync(mdFile, "utf8");
    const cleanedMd = stripTitleAndFrontmatter(rawMd);

    const slug = preSelectedSlug || (await selectBlogSlug());
    console.log(`${COLORS.dim}Selected blog slug: ${slug}${COLORS.reset}`);

    // Prepare target images dir
    const targetImagesDir = path.join(
      ROOT_DIR,
      "static",
      "images",
      "blog",
      slug
    );
    fs.mkdirSync(targetImagesDir, { recursive: true });

    // Copy referenced images and build mapping
    const refs = collectImageRefs(cleanedMd);
    console.log(
      `${COLORS.dim}Image references found: ${refs.length}${COLORS.reset}`
    );
    for (const r of refs) console.log(`${COLORS.dim}  - ${r}${COLORS.reset}`);
    const mapping = new Map();
    const copiedSourcePaths = new Set();
    for (const ref of refs) {
      const variants = generateRefVariants(ref).map((v) => cleanDraggedPath(v));
      // Preferred name comes from the original reference (strip query/hash only)
      const refPreferredName = path.basename(ref.replace(/[?#][\s\S]*$/, ""));
      let sourcePath = null;
      for (const v of variants) {
        const vNoQ = v.replace(/[?#][\s\S]*$/, "");
        const absCandidate = path.resolve(path.dirname(mdFile), v);
        const absCandidateNoQ = path.resolve(path.dirname(mdFile), vNoQ);
        if (fs.existsSync(absCandidate)) {
          sourcePath = absCandidate;
          break;
        }
        if (fs.existsSync(absCandidateNoQ)) {
          sourcePath = absCandidateNoQ;
          break;
        }
        const base = path.basename(vNoQ);
        const baseDecoded = (() => {
          try {
            return decodeURIComponent(base);
          } catch {
            return base;
          }
        })();
        const found1 = findFileByBasename(extractedDir, base);
        const found2 =
          !found1 && baseDecoded !== base
            ? findFileByBasename(extractedDir, baseDecoded)
            : null;
        const found3 =
          !found1 && !found2
            ? findFileByStemFlexible(extractedDir, baseDecoded)
            : null;
        if (found1 || found2 || found3) {
          const found = found1 || found2 || found3;
          console.log(
            `${COLORS.dim}Resolved by basename/stem:${COLORS.reset} ${v} -> ${found}`
          );
          sourcePath = found;
          break;
        }
      }
      if (!sourcePath) {
        console.log(
          `${COLORS.yellow}Skipping missing asset: ${ref}${COLORS.reset}`
        );
        continue;
      }
      const targetName = path.basename(sourcePath); // use the actual source file name
      const targetPath = path.join(targetImagesDir, targetName);
      // Always copy/overwrite to ensure the file content matches the current import
      fs.copyFileSync(sourcePath, targetPath);
      console.log(
        `${COLORS.dim}Copied asset:${COLORS.reset} ${sourcePath} ${COLORS.dim}->${COLORS.reset} ${targetPath}`
      );
      copiedSourcePaths.add(sourcePath);
      const newUrl = `/images/blog/${slug}/${targetName}`;
      for (const v of variants) {
        mapping.set(v, newUrl);
        const vNoQ = v.replace(/[?#][\s\S]*$/, "");
        mapping.set(vNoQ, newUrl);
      }
    }

    // Copy any remaining image files from the Notion export (flattened) for completeness
    const allImages = listAllImageFiles(extractedDir);
    let extraCopied = 0;
    for (const imgPath of allImages) {
      if (copiedSourcePaths.has(imgPath)) continue;
      const targetName = path.basename(imgPath);
      const targetPath = path.join(targetImagesDir, targetName);
      try {
        fs.copyFileSync(imgPath, targetPath);
        extraCopied++;
      } catch {}
    }
    if (extraCopied > 0) {
      console.log(
        `${COLORS.dim}Copied ${extraCopied} additional image(s) from export${COLORS.reset}`
      );
    }

    const rewrittenMd = rewriteMarkdownPathsSimple(cleanedMd, slug);

    const markdocPath = updateMarkdocBody(slug, rewrittenMd);

    console.log(
      `\n${COLORS.pink}${COLORS.bright}✨ Import complete!${COLORS.reset}`
    );
    console.log(`${COLORS.bright}Updated:${COLORS.reset} ${markdocPath}`);
    console.log(`${COLORS.bright}Assets:${COLORS.reset} ${targetImagesDir}`);

    // Auto-run sanitize on the imported blog
    try {
      const { sanitizeSlug } = await import("./sanitize.js");
      console.log(`\n${COLORS.dim}Running sanitize...${COLORS.reset}`);
      sanitizeSlug(slug);
    } catch (e) {
      console.log(
        `${COLORS.yellow}Sanitize skipped: ${e.message}${COLORS.reset}`
      );
    }
  } catch (error) {
    console.log(`\n${COLORS.red}Error: ${error.message}${COLORS.reset}`);
  }

  if (!skipClose) {
    closeReadline();
  }
}

process.on("SIGINT", () => {
  console.log(
    `\n${COLORS.yellow}Process interrupted. Exiting...${COLORS.reset}`
  );
  closeReadline();
  process.exit(0);
});

export async function runImportNotion({ slug, zip, mdFile, skipClose } = {}) {
  await main({
    preSelectedSlug: slug || null,
    preSelectedZip: zip || null,
    preSelectedMdFile: mdFile !== undefined ? mdFile : null,
    skipClose: !!skipClose,
  });
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main();
}
