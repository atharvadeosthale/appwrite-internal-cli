#!/usr/bin/env node
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printHelp() {
  console.log(`Usage: npx appwrite-internal-cli <group> <command>\n`);
  console.log(`Groups:`);
  console.log(`  blog                 Blog-related commands`);
  console.log(`\nCommands:`);
  console.log(`  blog create-author   Create a new blog author`);
  console.log(`  blog create-blog     Create a new blog post`);
  console.log(
    `  blog import-notion   Import Notion export into an existing blog post`
  );
  console.log(`  blog sanitize        Sanitize a blog post (headings, quotes)`);
}

async function run() {
  const [, , group, command] = process.argv;

  if (!group || !command) {
    printHelp();
    process.exit(group || command ? 1 : 0);
  }

  if (group === "blog" && command === "create-author") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "create-author.js")).href
    );
    await mod.runCreateAuthor();
    return;
  }

  if (group === "blog" && command === "create-blog") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "create-blog.js")).href
    );
    await mod.runCreateBlog();
    return;
  }

  if (group === "blog" && command === "import-notion") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "import-notion.js")).href
    );
    await mod.runImportNotion();
    return;
  }

  if (group === "blog" && command === "sanitize") {
    const mod = await import(
      pathToFileURL(path.join(__dirname, "..", "sanitize.js")).href
    );
    await mod.runSanitize();
    return;
  }

  console.log(`Unknown command: ${group} ${command}\n`);
  printHelp();
  process.exit(1);
}

run();
