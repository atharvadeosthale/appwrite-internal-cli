#!/usr/bin/env node
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printHelp() {
  console.log(
    `Appwrite Internal CLI — website content management\n`
  );
  console.log(`Usage: npx appwrite-internal-cli <group> <command> [flags]\n`);
  console.log(`Groups:`);
  console.log(`  blog                 Blog-related commands\n`);
  console.log(
    `Run 'npx appwrite-internal-cli blog' to see all blog commands.`
  );
  console.log(
    `Pass --flags to run non-interactively. See DOCS.md for full reference.`
  );
}

function printBlogHelp() {
  console.log(
    `Appwrite Internal CLI — blog commands\n`
  );
  console.log(`Usage: npx appwrite-internal-cli blog <command> [flags]\n`);
  console.log(`Commands:`);
  console.log(`  create-author        Create a new blog author`);
  console.log(`  create-blog          Create a new blog post`);
  console.log(
    `  import-notion        Import Notion export into an existing blog post`
  );
  console.log(`  sanitize             Fix headings and curly quotes in a blog post`);
  console.log(`\nAPIs (JSON output — no flags, no interaction):`);
  console.log(`  get-authors          List all authors as JSON`);
  console.log(`  get-categories       List all categories as JSON`);
  console.log(`  get-blogs            List all blog posts as JSON`);
  console.log(
    `\nPass --flags to run commands non-interactively. See DOCS.md for full reference.`
  );
}

function parseFlags() {
  const args = process.argv.slice(4);
  const flags = {};
  const booleanFlags = new Set(["force", "featured"]);
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const raw = arg.slice(2);
      const key = raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (booleanFlags.has(key)) {
        flags[key] = true;
        i++;
      } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        flags[key] = args[i + 1];
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else {
      i++;
    }
  }
  return flags;
}

async function run() {
  const [, , group, command] = process.argv;

  if (!group) {
    printHelp();
    process.exit(0);
  }

  if (group === "blog" && (!command || command === "help")) {
    printBlogHelp();
    process.exit(0);
  }

  if (!command) {
    console.log(`Unknown group: ${group}\n`);
    printHelp();
    process.exit(1);
  }

  const flags = parseFlags();

  if (group === "blog" && command === "create-author") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "create-author.js")).href
    );
    await mod.runCreateAuthor(flags);
    return;
  }

  if (group === "blog" && command === "create-blog") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "create-blog.js")).href
    );
    await mod.runCreateBlog(flags);
    return;
  }

  if (group === "blog" && command === "import-notion") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "import-notion.js")).href
    );
    await mod.runImportNotion(flags);
    return;
  }

  if (group === "blog" && command === "sanitize") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "sanitize.js")).href
    );
    await mod.runSanitize(flags);
    return;
  }

  if (group === "blog" && command === "get-authors") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "application.js")).href
    );
    console.log(JSON.stringify(mod.getAuthors(), null, 2));
    return;
  }

  if (group === "blog" && command === "get-categories") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "application.js")).href
    );
    console.log(JSON.stringify(mod.getCategories(), null, 2));
    return;
  }

  if (group === "blog" && command === "get-blogs") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "application.js")).href
    );
    console.log(JSON.stringify(mod.getBlogs(), null, 2));
    return;
  }

  if (group === "blog") {
    console.log(`Unknown command: blog ${command}\n`);
    printBlogHelp();
  } else {
    console.log(`Unknown command: ${group} ${command}\n`);
    printHelp();
  }
  process.exit(1);
}

run();
