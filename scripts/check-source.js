import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ignoredDirectories = new Set([
  ".git",
  ".npm-cache",
  ".sites-runtime",
  "coverage",
  "node_modules"
]);

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findJavaScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }

  return files;
}

const files = await findJavaScriptFiles(process.cwd());
let hasFailure = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    hasFailure = true;
    console.error(result.stderr);
  }
}

if (hasFailure) {
  process.exitCode = 1;
} else {
  console.log(`${files.length}개 JavaScript 파일의 문법을 확인했습니다.`);
}
