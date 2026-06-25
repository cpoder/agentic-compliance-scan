import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Copy the rules data files into the build output. tsc does not copy non-TS
// files, so without this the published CLI would ship code without its data.
// (Lesson learned the hard way elsewhere: never let a build prune the data a
// loader reads at runtime.)
const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "src", "rules", "data");
const dest = join(here, "..", "dist", "rules", "data");

mkdirSync(dest, { recursive: true });
let copied = 0;
for (const file of readdirSync(src)) {
  if (file.endsWith(".json")) {
    copyFileSync(join(src, file), join(dest, file));
    copied += 1;
  }
}
process.stdout.write(`copied ${copied} rules data file(s) to dist\n`);
