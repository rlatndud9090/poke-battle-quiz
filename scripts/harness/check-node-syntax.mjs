#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const targets = [
  path.join(repoRoot, "eslint.config.js"),
  ...listFiles(path.join(repoRoot, "scripts", "harness"), [".mjs"]),
];

for (const target of targets) {
  const result = spawnSync(process.execPath, ["--check", target], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  console.log(`[build] syntax ok: ${path.relative(repoRoot, target)}`);
}

function listFiles(directory, extensions) {
  if (!fs.existsSync(directory)) return [];

  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath, extensions));
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files.sort();
}
