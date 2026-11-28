#!/usr/bin/env node
// Fails when a staged blob (or, with --all, a tracked file) matches a private pattern.
// Patterns live in the git-ignored .leak-patterns.local, one `label<TAB>regex` per line.
// Output names only the label, path, and line, never the matched text.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PATTERNS_FILE = ".leak-patterns.local";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"])
  .toString()
  .trim();
const patternsPath = join(root, PATTERNS_FILE);
if (!existsSync(patternsPath)) process.exit(0);

const patterns = parsePatterns(readFileSync(patternsPath, "utf8"));
const scanAll = process.argv.includes("--all");

const paths = splitNul(
  scanAll
    ? git(["ls-files", "-z"])
    : git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]),
);

const findings = [];
for (const path of paths) {
  const content = scanAll
    ? readTracked(path)
    : git(["show", `:${path}`], { maxBuffer: 64 * 1024 * 1024 });
  if (content === null || content.includes(0)) continue;
  const lines = content.toString("utf8").split("\n");
  lines.forEach((line, index) => {
    for (const { label, regex } of patterns) {
      if (regex.test(line)) findings.push(`${path}:${index + 1} ${label}`);
    }
  });
}

if (findings.length > 0) {
  console.error(
    `Leak check: ${findings.length} match(es) against ${PATTERNS_FILE}:`,
  );
  for (const finding of findings) console.error(`  ${finding}`);
  process.exit(1);
}
console.log(
  `Leak check: ${paths.length} ${scanAll ? "tracked" : "staged"} file(s) clean.`,
);

function parsePatterns(text) {
  const parsed = [];
  text.split("\n").forEach((raw, index) => {
    const line = raw.trimEnd();
    if (line === "" || line.startsWith("#")) return;
    const tab = line.indexOf("\t");
    if (tab <= 0 || tab === line.length - 1) {
      fail(`${PATTERNS_FILE}:${index + 1} is not "label<TAB>regex".`);
    }
    const label = line.slice(0, tab);
    try {
      parsed.push({ label, regex: new RegExp(line.slice(tab + 1), "i") });
    } catch {
      fail(`${PATTERNS_FILE}:${index + 1} (${label}) is not a valid regex.`);
    }
  });
  return parsed;
}

function readTracked(path) {
  const absolute = join(root, path);
  return existsSync(absolute) ? readFileSync(absolute) : null;
}

function git(args, options = {}) {
  return execFileSync("git", args, { cwd: root, ...options });
}

function splitNul(buffer) {
  return buffer.toString("utf8").split("\0").filter(Boolean);
}

function fail(message) {
  console.error(`Leak check: ${message}`);
  process.exit(2);
}
