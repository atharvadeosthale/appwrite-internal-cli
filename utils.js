import readline from "readline";
import process from "process";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  pink: "\x1b[38;2;253;54;110m", // #fd366e
};

export function printHeader(
  title = "INTERNAL CLI",
  subtitle = "Appwrite website content management"
) {
  console.clear();
  console.log(`${COLORS.pink}${COLORS.bright}`);
  console.log("    ___                          _ __     ");
  console.log("   / _ | ___  ___  _    ___ ____(_) /____ ");
  console.log("  / __ |/ _ \\/ _ \\| |/|/ / __/ / / __/ -_)");
  console.log(" /_/ |_/ .__/ .__/|__,__/_/ /_/_/\\__/\\__/ ");
  console.log("      /_/  /_/                             ");
  console.log("");
  console.log(`  ${title}`);
  console.log(`${COLORS.reset}\n`);
  console.log(`${COLORS.dim}${subtitle}${COLORS.reset}\n`);
}

export function question(prompt) {
  return new Promise((resolve) => {
    rl.question(`${COLORS.yellow}${prompt}${COLORS.reset}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

export function questionWithDefault(prompt, defaultValue) {
  return new Promise((resolve) => {
    rl.question(
      `${COLORS.yellow}${prompt} ${COLORS.dim}(default: ${defaultValue})${COLORS.reset}${COLORS.yellow}: ${COLORS.reset}`,
      (answer) => {
        resolve(answer.trim() || defaultValue);
      }
    );
  });
}

export async function selectFromList(prompt, options) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const maxVisible = 10;
    let scrollOffset = 0;

    const render = () => {
      // Clear screen and redraw
      console.log("\x1b[2J\x1b[H");
      console.log(`\n${COLORS.pink}${prompt}${COLORS.reset}`);
      console.log(
        `${COLORS.dim}(Use ↑↓ to navigate, Enter to select)${COLORS.reset}\n`
      );

      // Calculate visible range
      const startIdx = scrollOffset;
      const endIdx = Math.min(startIdx + maxVisible, options.length);

      // Show scroll indicator if needed
      if (startIdx > 0) {
        console.log(`  ${COLORS.dim}▲ ${startIdx} more above${COLORS.reset}`);
      }

      // Render visible options
      for (let i = startIdx; i < endIdx; i++) {
        const option = options[i];
        if (i === selectedIndex) {
          console.log(
            `${COLORS.pink}❯ ${option.label || option}${COLORS.reset}`
          );
        } else {
          console.log(
            `  ${COLORS.dim}${option.label || option}${COLORS.reset}`
          );
        }
      }

      // Show scroll indicator if needed
      if (endIdx < options.length) {
        console.log(
          `  ${COLORS.dim}▼ ${options.length - endIdx} more below${
            COLORS.reset
          }`
        );
      }
    };

    const updateScroll = () => {
      if (selectedIndex < scrollOffset) {
        scrollOffset = selectedIndex;
      } else if (selectedIndex >= scrollOffset + maxVisible) {
        scrollOffset = selectedIndex - maxVisible + 1;
      }
    };

    render();

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const keypress = (key) => {
      if (key === "\u0003") {
        // Ctrl+C
        process.stdin.setRawMode(false);
        process.stdin.pause();
        console.log("\n");
        process.exit();
      }

      if (key === "\r" || key === "\n") {
        // Enter
        process.stdin.removeListener("data", keypress);
        process.stdin.setRawMode(false);
        process.stdin.resume();
        console.log("");
        resolve(
          options[selectedIndex].value !== undefined
            ? options[selectedIndex].value
            : options[selectedIndex]
        );
        return;
      }

      if (key === "\u001b[A") {
        // Up arrow
        selectedIndex =
          selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
        updateScroll();
        render();
      }

      if (key === "\u001b[B") {
        // Down arrow
        selectedIndex =
          selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
        updateScroll();
        render();
      }
    };

    process.stdin.on("data", keypress);
  });
}

export async function multiSelectFromList(prompt, options) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    let selectedItems = new Set();
    const maxVisible = 10;
    let scrollOffset = 0;

    const render = () => {
      console.log("\x1b[2J\x1b[H");
      console.log(`\n${COLORS.pink}${prompt}${COLORS.reset}`);
      console.log(
        `${COLORS.dim}(Use ↑↓ to navigate, Space to select/deselect, Enter to confirm)${COLORS.reset}\n`
      );

      // Calculate visible range
      const startIdx = scrollOffset;
      const endIdx = Math.min(startIdx + maxVisible, options.length);

      // Show scroll indicator if needed
      if (startIdx > 0) {
        console.log(`  ${COLORS.dim}▲ ${startIdx} more above${COLORS.reset}`);
      }

      // Render visible options
      for (let i = startIdx; i < endIdx; i++) {
        const option = options[i];
        const isSelected = selectedItems.has(i);
        const checkbox = isSelected
          ? `${COLORS.pink}[✓]${COLORS.reset}`
          : "[ ]";
        const label = option.label || option;

        if (i === selectedIndex) {
          console.log(`${COLORS.pink}❯${COLORS.reset} ${checkbox} ${label}`);
        } else {
          console.log(`  ${checkbox} ${COLORS.dim}${label}${COLORS.reset}`);
        }
      }

      // Show scroll indicator if needed
      if (endIdx < options.length) {
        console.log(
          `  ${COLORS.dim}▼ ${options.length - endIdx} more below${
            COLORS.reset
          }`
        );
      }

      if (selectedItems.size > 0) {
        console.log(
          `\n${COLORS.dim}Selected: ${selectedItems.size} item(s)${COLORS.reset}`
        );
      }
    };

    const updateScroll = () => {
      if (selectedIndex < scrollOffset) {
        scrollOffset = selectedIndex;
      } else if (selectedIndex >= scrollOffset + maxVisible) {
        scrollOffset = selectedIndex - maxVisible + 1;
      }
    };

    render();

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const keypress = (key) => {
      if (key === "\u0003") {
        // Ctrl+C
        process.stdin.setRawMode(false);
        process.stdin.pause();
        console.log("\n");
        process.exit();
      }

      if (key === "\r" || key === "\n") {
        // Enter
        process.stdin.removeListener("data", keypress);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        console.log("");
        const selected = Array.from(selectedItems).map(
          (i) => options[i].value || options[i]
        );
        resolve(selected);
        return;
      }

      if (key === " ") {
        // Space
        if (selectedItems.has(selectedIndex)) {
          selectedItems.delete(selectedIndex);
        } else {
          selectedItems.add(selectedIndex);
        }
        render();
      }

      if (key === "\u001b[A") {
        // Up arrow
        selectedIndex =
          selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
        updateScroll();
        render();
      }

      if (key === "\u001b[B") {
        // Down arrow
        selectedIndex =
          selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
        updateScroll();
        render();
      }
    };

    process.stdin.on("data", keypress);
  });
}

export async function selectFromListFilter(prompt, options) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const maxVisible = 10;
    let scrollOffset = 0;
    let filterText = "";

    const getFiltered = () => {
      const q = filterText.toLowerCase();
      if (!q) return options;
      return options.filter((o) =>
        String(o.label || o)
          .toLowerCase()
          .includes(q)
      );
    };

    const render = () => {
      const filtered = getFiltered();
      if (selectedIndex >= filtered.length)
        selectedIndex = Math.max(0, filtered.length - 1);
      if (selectedIndex < scrollOffset) scrollOffset = selectedIndex;
      if (selectedIndex >= scrollOffset + maxVisible)
        scrollOffset = selectedIndex - maxVisible + 1;

      console.log("\x1b[2J\x1b[H");
      console.log(`\n${COLORS.pink}${prompt}${COLORS.reset}`);
      console.log(
        `${COLORS.dim}(Type to filter, Backspace to edit, ↑↓ to navigate, Enter to select)${COLORS.reset}`
      );
      console.log(`${COLORS.dim}Filter:${COLORS.reset} ${filterText}\n`);

      if (filtered.length === 0) {
        console.log(`  ${COLORS.dim}No matches${COLORS.reset}`);
        return;
      }

      const startIdx = scrollOffset;
      const endIdx = Math.min(startIdx + maxVisible, filtered.length);

      if (startIdx > 0) {
        console.log(`  ${COLORS.dim}▲ ${startIdx} more above${COLORS.reset}`);
      }

      for (let i = startIdx; i < endIdx; i++) {
        const option = filtered[i];
        if (i === selectedIndex) {
          console.log(
            `${COLORS.pink}❯ ${option.label || option}${COLORS.reset}`
          );
        } else {
          console.log(
            `  ${COLORS.dim}${option.label || option}${COLORS.reset}`
          );
        }
      }

      if (endIdx < filtered.length) {
        console.log(
          `  ${COLORS.dim}▼ ${filtered.length - endIdx} more below${
            COLORS.reset
          }`
        );
      }
    };

    const handlePrintable = (ch) => {
      // Accept printable characters (basic)
      if (ch.length !== 1) return false;
      const code = ch.charCodeAt(0);
      if (code >= 32 && code !== 127) {
        filterText += ch;
        selectedIndex = 0;
        scrollOffset = 0;
        return true;
      }
      return false;
    };

    const keypress = (key) => {
      if (key === "\u0003") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        console.log("\n");
        process.exit();
      }

      const filtered = getFiltered();

      if (key === "\r" || key === "\n") {
        process.stdin.removeListener("data", keypress);
        process.stdin.setRawMode(false);
        process.stdin.resume();
        console.log("");
        if (filtered.length > 0) {
          const chosen = filtered[selectedIndex];
          resolve(chosen.value !== undefined ? chosen.value : chosen);
        } else {
          resolve("");
        }
        return;
      }

      if (key === "\u001b[A") {
        // Up
        if (filtered.length > 0) {
          selectedIndex =
            selectedIndex > 0 ? selectedIndex - 1 : filtered.length - 1;
          if (selectedIndex < scrollOffset) scrollOffset = selectedIndex;
        }
        render();
        return;
      }

      if (key === "\u001b[B") {
        // Down
        if (filtered.length > 0) {
          selectedIndex =
            selectedIndex < filtered.length - 1 ? selectedIndex + 1 : 0;
          if (selectedIndex >= scrollOffset + maxVisible)
            scrollOffset = selectedIndex - maxVisible + 1;
        }
        render();
        return;
      }

      if (key === "\u007f") {
        // Backspace
        if (filterText.length > 0) filterText = filterText.slice(0, -1);
        selectedIndex = 0;
        scrollOffset = 0;
        render();
        return;
      }

      // Ignore escape sequences (arrow keys etc.)
      if (key.startsWith("\u001b")) return;

      if (handlePrintable(key)) {
        render();
        return;
      }
    };

    render();

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", keypress);
  });
}

export async function imagePathInput(prompt, targetPath) {
  console.log(`\n${COLORS.pink}${prompt}${COLORS.reset}`);
  console.log(
    `${COLORS.dim}Drag & drop an image file here, or press Enter to add later${COLORS.reset}`
  );
  console.log(
    `${COLORS.dim}Image will be saved to: ${targetPath}${COLORS.reset}\n`
  );

  const input = await question("Image path: ");

  if (!input || !input.trim()) {
    return { sourcePath: null, targetPath };
  }

  // Clean up dragged file path:
  // 1. Remove surrounding quotes
  // 2. Replace escaped spaces (\ ) with regular spaces
  // 3. Handle escaped quotes
  let cleanPath = input
    .trim()
    .replace(/^['"]|['"]$/g, "") // Remove surrounding quotes
    .replace(/\\ /g, " ") // Replace escaped spaces
    .replace(/\\"/g, '"') // Replace escaped quotes
    .replace(/\\'/g, "'"); // Replace escaped single quotes

  // Check if file exists
  const fs = await import("fs");

  if (fs.existsSync(cleanPath)) {
    console.log(
      `${COLORS.pink}✓${COLORS.reset} Image selected: ${COLORS.dim}${cleanPath}${COLORS.reset}`
    );
    return { sourcePath: cleanPath, targetPath };
  } else {
    console.log(`${COLORS.red}File not found: ${cleanPath}${COLORS.reset}`);
    return { sourcePath: null, targetPath };
  }
}

export async function copyImage(sourcePath, targetPath) {
  if (!sourcePath) return false;

  const fs = await import("fs");
  const path = await import("path");

  try {
    // Create directory if it doesn't exist
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy the file
    fs.copyFileSync(sourcePath, targetPath);
    console.log(
      `${COLORS.pink}✓${COLORS.reset} Image copied to: ${COLORS.dim}${targetPath}${COLORS.reset}`
    );
    return true;
  } catch (error) {
    console.log(
      `${COLORS.red}Failed to copy image: ${error.message}${COLORS.reset}`
    );
    return false;
  }
}

export function closeReadline() {
  rl.close();
}
