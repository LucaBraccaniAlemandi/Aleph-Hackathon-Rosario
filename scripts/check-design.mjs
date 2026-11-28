#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceDirs = ["apps/web/src"];
const tokenFile = "apps/web/src/styles.css";
const scanned = /\.(tsx?|jsx?|css)$/;
const generated = /(^|\/)(routeTree\.gen\.ts|gen\/)/;

const rules = [
	{
		pattern: /\b[a-z][a-z0-9-]*-\[(#|rgba?\(|hsla?\(|oklch\(|oklab\(|color:)/g,
		message: "arbitrary color value in a class name; add a token to the @theme block instead",
	},
	{
		pattern: /(^|[\s"'`(:,=])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,
		message: "raw hex color; use a theme token",
	},
	{
		pattern: /\b(rgba?|hsla?|oklch|oklab|lab|lch)\(/g,
		message: "raw color function; use a theme token",
	},
];

function* walk(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(path);
		else yield path;
	}
}

const findings = [];
for (const dir of sourceDirs) {
	let files;
	try {
		files = [...walk(join(root, dir))];
	} catch {
		continue;
	}
	for (const file of files) {
		const rel = relative(root, file).split(sep).join("/");
		if (!scanned.test(rel) || generated.test(rel) || rel === tokenFile) continue;
		const lines = readFileSync(file, "utf8").split("\n");
		lines.forEach((line, index) => {
			for (const { pattern, message } of rules) {
				pattern.lastIndex = 0;
				if (pattern.test(line)) findings.push(`${rel}:${index + 1}: ${message}`);
			}
		});
	}
}

if (findings.length > 0) {
	console.error(findings.join("\n"));
	console.error(`\ncheck:design found ${findings.length} problem(s). Colors live in ${tokenFile}.`);
	process.exit(1);
}
console.log("check:design ok");
