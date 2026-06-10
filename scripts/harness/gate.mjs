#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = [
  ["npm", ["run", "harness:check"]],
  ["npm", ["run", "lint"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "test:run"]],
];

for (const [command, args] of steps) {
  console.log(`[harness:gate] ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("[harness:gate] ok");
