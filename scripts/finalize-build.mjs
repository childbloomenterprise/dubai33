import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const index = await readFile("dist/index.html");
const hash = createHash("sha256").update(index).digest("hex").slice(0, 12);
const worker = await readFile("dist/sw.js", "utf8");
await writeFile(
  "dist/sw.js",
  worker.replace("linc33-shell-v1", `linc33-shell-${hash}`),
);
console.log("App-shell cache version bound to this build.");
