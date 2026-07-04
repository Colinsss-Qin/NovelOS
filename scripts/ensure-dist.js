const fs = require("fs");
const path = require("path");

const requiredEntries = [
  "dist/project-skill/index.js",
  "dist/project-skill/storage.js",
  "dist/character-skill/index.js",
  "dist/outline-skill/index.js",
];

const missing = requiredEntries.filter((entry) => {
  return !fs.existsSync(path.join(__dirname, "..", entry));
});

if (missing.length > 0) {
  console.error("Missing compiled skill output:");
  missing.forEach((entry) => console.error(`  - ${entry}`));
  console.error("Run `npm run build` before starting NovelOS.");
  process.exit(1);
}
