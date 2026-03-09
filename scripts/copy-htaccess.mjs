import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("public/.htaccess");
const target = resolve("dist/.htaccess");

if (!existsSync(source)) {
  console.warn("[copy-htaccess] Skipped: public/.htaccess not found");
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("[copy-htaccess] Copied public/.htaccess to dist/.htaccess");
