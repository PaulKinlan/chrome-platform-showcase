import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Vocabulary from https://drafts.csswg.org/css-borders-4/#typedef-corner-shape-value.
// Browser parsing/rendering is checked separately through Chrome DevTools MCP.
const feature = new URL("../v155/css-corner-shorthand-properties/", import.meta.url);
const gallery = readFileSync(new URL("shape-gallery/index.html", feature), "utf8");
const builder = readFileSync(new URL("corner-builder/index.html", feature), "utf8");
const keywords = ["round", "bevel", "scoop", "notch", "squircle", "square"];

const galleryValues = [...gallery.matchAll(/^\s*\['([^']+)',/gm)].map((match) => match[1]);
const builderList = builder.match(/const SHAPES = \[([^\]]+)\];/);
assert.ok(builderList, "Builder must expose its shape vocabulary");
const builderValues = [...builderList[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);

assert.deepEqual(galleryValues, [...keywords, "superellipse(2)"]);
assert.deepEqual(builderValues, keywords);
assert.doesNotMatch(gallery, /all six boxes|six shapes/);
assert.match(gallery, /\$\{built\.length\} example/);
assert.match(gallery, /not the newer <code>corner<\/code> shorthands/);
console.log("PASS — valid gallery/builder vocabulary and accurate example-count copy");
