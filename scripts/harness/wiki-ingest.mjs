#!/usr/bin/env node
import path from "node:path";
import {
  extractH1,
  fail,
  inferRawUnitFromBranch,
  parseArgs,
  pathExists,
  rawUnitPath,
  readText,
  relativeFromWiki,
  repoPath,
  stripKnownPrefix,
  toPosix,
  validateTypeAndSlug,
  writeText,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const positionalPath = args._[0];
let unitDir;

if (positionalPath) {
  unitDir = path.resolve(process.cwd(), positionalPath);
} else {
  const { parsed } = inferRawUnitFromBranch();
  if (!parsed) fail("pass a raw unit path or run from feature/*, bugfix/*, or chore/*");
  unitDir = rawUnitPath(parsed.type, parsed.slug);
}

const relativeUnit = toPosix(path.relative(repoPath("docs", "raw"), unitDir));
const [type, slug] = relativeUnit.split("/");
validateTypeAndSlug(type, slug);

if (!pathExists(unitDir)) {
  fail(`raw unit does not exist: ${toPosix(path.relative(process.cwd(), unitDir))}`);
}

const files = [
  ["PRD", "prd.md"],
  ["ADR", "adr.md"],
  ["Bugfix", "bugfix.md"],
  ["Notes", "notes.md"],
].filter(([, fileName]) => pathExists(path.join(unitDir, fileName)));

if (files.length === 0) {
  fail(`raw unit has no markdown artifact: ${relativeUnit}`);
}

const titleSource = files.find(([, fileName]) => fileName === "prd.md") ?? files[0];
const titleContent = readText(path.join(unitDir, titleSource[1]));
const title = stripKnownPrefix(extractH1(titleContent) ?? slug);
const category = args.category || (type === "feature" ? "Product & Architecture" : "Project Operations");
const wikiPath = repoPath("docs", "wiki", "index.md");
let wiki = readText(wikiPath);

const primaryPath = path.join(unitDir, titleSource[1]);
const primaryLink = relativeFromWiki(primaryPath);

if (wiki.includes(`](${primaryLink})`)) {
  console.log(`[wiki-ingest] ${relativeUnit} already linked`);
  process.exit(0);
}

const linkParts = files.map(([label, fileName]) => `[${label}](${relativeFromWiki(path.join(unitDir, fileName))})`);
const line = `- **${title}** — ${linkParts.join(" · ")}`;
const heading = `### ${category}`;
const headingIndex = wiki.indexOf(heading);

if (headingIndex === -1) {
  const rawUnitsIndex = wiki.indexOf("## Maintenance");
  if (rawUnitsIndex === -1) fail("could not find Maintenance section in wiki index");
  wiki = `${wiki.slice(0, rawUnitsIndex).trimEnd()}\n\n${heading}\n\n${line}\n\n${wiki.slice(rawUnitsIndex)}`;
} else {
  const nextHeading = wiki.indexOf("\n### ", headingIndex + heading.length);
  const nextSection = wiki.indexOf("\n## ", headingIndex + heading.length);
  const candidates = [nextHeading, nextSection].filter((index) => index !== -1);
  const insertAt = candidates.length ? Math.min(...candidates) : wiki.length;
  const before = wiki.slice(0, insertAt).trimEnd();
  const after = wiki.slice(insertAt);
  wiki = `${before}\n${line}\n${after}`;
}

writeText(wikiPath, wiki);

console.log(`[wiki-ingest] ${relativeUnit} linked`);
console.log(`- category: ${category}`);
console.log(`- link: ${line}`);
