"use strict";

/**
 * Regenerates scripts/sampleData.js from cabzii-ultimate/src/data/travelData.js (cabs, packages, driverServices).
 * Run after editing travelData so the DB seed stays aligned.
 */

const fs = require("fs");
const path = require("path");

const travelPath = path.join(__dirname, "..", "..", "cabzii-ultimate", "src", "data", "travelData.js");
const outPath = path.join(__dirname, "sampleData.js");

let s = fs.readFileSync(travelPath, "utf8");
const i = s.indexOf("// Backward-compatible");
if (i < 0) {
  console.error("travelData.js: expected '// Backward-compatible' marker not found");
  process.exit(1);
}
s = s.slice(0, i).replace(/export const /g, "const ");
fs.writeFileSync(outPath, `${s}module.exports={cabs,packages,driverServices};\n`);
console.log(`Wrote ${outPath}`);
