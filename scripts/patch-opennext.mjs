import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(
  __dirname,
  "..",
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "build",
  "patches",
  "plugins",
  "load-manifest.js"
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, "utf8");
  let modified = false;

  // 1. Include preview-props in the glob search
  if (!content.includes("prefetch-hints,preview-props}")) {
    content = content.replace(
      "prefetch-hints}.json",
      "prefetch-hints,preview-props}.json"
    );
    modified = true;
  }

  // 2. Include preview-props in optional manifest fallback
  if (!content.includes('p.endsWith("preview-props")')) {
    content = content.replace(
      'p.endsWith("prefetch-hints")',
      'p.endsWith("preview-props") ||\n        p.endsWith("prefetch-hints")'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(targetFile, content, "utf8");
    console.log("[patch-opennext] Applied preview-props patch to @opennextjs/cloudflare.");
  } else {
    console.log("[patch-opennext] @opennextjs/cloudflare already patched.");
  }
} else {
  console.log("[patch-opennext] Target file not found, skipping patch.");
}
