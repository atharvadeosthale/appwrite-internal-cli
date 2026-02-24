import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const ROOT_DIR = process.cwd();

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const lines = match[1].split("\n");
  const data = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (/^\d+$/.test(value)) value = parseInt(value, 10);
    data[key] = value;
  }
  return data;
}

export function getAuthors() {
  const authorsDir = path.join(ROOT_DIR, "src", "routes", "blog", "author");
  const authors = [];
  if (!fs.existsSync(authorsDir)) return authors;
  const entries = fs.readdirSync(authorsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const markdocPath = path.join(authorsDir, slug, "+page.markdoc");
    if (!fs.existsSync(markdocPath)) continue;
    const content = fs.readFileSync(markdocPath, "utf8");
    const data = parseFrontmatter(content);
    if (!data) continue;
    authors.push({
      slug,
      name: data.name || slug,
      role: data.role || "",
      bio: data.bio || "",
      avatar: data.avatar || "",
      twitter: data.twitter || "",
      github: data.github || "",
      linkedin: data.linkedin || "",
    });
  }
  return authors.sort((a, b) => a.name.localeCompare(b.name));
}

export function getCategories() {
  const categoriesDir = path.join(
    ROOT_DIR,
    "src",
    "routes",
    "blog",
    "category"
  );
  const categories = [];
  if (!fs.existsSync(categoriesDir)) return categories;
  const entries = fs.readdirSync(categoriesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const slug = entry.name;
    const markdocPath = path.join(categoriesDir, slug, "+page.markdoc");
    if (!fs.existsSync(markdocPath)) {
      categories.push({ slug, name: slug, description: "" });
      continue;
    }
    const content = fs.readFileSync(markdocPath, "utf8");
    const data = parseFrontmatter(content);
    if (!data) {
      categories.push({ slug, name: slug, description: "" });
      continue;
    }
    categories.push({
      slug,
      name: data.name || slug,
      description: data.description || "",
    });
  }
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}

export function getBlogs() {
  const postsDir = path.join(ROOT_DIR, "src", "routes", "blog", "post");
  const blogs = [];
  if (!fs.existsSync(postsDir)) return blogs;
  const entries = fs.readdirSync(postsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const markdocPath = path.join(postsDir, slug, "+page.markdoc");
    if (!fs.existsSync(markdocPath)) continue;
    const content = fs.readFileSync(markdocPath, "utf8");
    const data = parseFrontmatter(content);
    if (!data) continue;
    blogs.push({
      slug,
      title: data.title || slug,
      description: data.description || "",
      date: data.date || "",
      cover: data.cover || "",
      timeToRead: typeof data.timeToRead === "number" ? data.timeToRead : 0,
      author: data.author || "",
      category: data.category || "",
      featured: data.featured === true,
    });
  }
  return blogs.sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    return db.localeCompare(da);
  });
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const sub = process.argv[2];
  if (sub === "authors") {
    console.log(JSON.stringify(getAuthors(), null, 2));
  } else if (sub === "categories") {
    console.log(JSON.stringify(getCategories(), null, 2));
  } else if (sub === "blogs") {
    console.log(JSON.stringify(getBlogs(), null, 2));
  } else {
    console.error("Usage: node application.js <authors|categories|blogs>");
    process.exit(1);
  }
}
