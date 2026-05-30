const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../../cabzii-ultimate/src/data/travelData.js");
let s = fs.readFileSync(src, "utf8");
s = s.replace(/export const /g, "const ");
const i = s.indexOf("// Backward-compatible");
if (i >= 0) s = s.slice(0, i);
s += "\nmodule.exports = { cabs, packages, driverServices, blogs, testimonials };\n";
fs.writeFileSync(path.join(__dirname, "contentData.js"), s);
console.log("Wrote contentData.js");
