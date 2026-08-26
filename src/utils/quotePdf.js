"use strict";

const { formatQuoteLines } = require("./quotePackage");

function pdfEscape(text) {
  return String(text || "")
    .replace(/₹/g, "Rs.")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, (ch) => {
      try {
        return ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "") || "?";
      } catch {
        return "?";
      }
    })
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildQuotePdfBuffer(quote = {}) {
  const heading = "Cabzii.in package quote";
  const sub = quote.quoteRef ? `Quote ${quote.quoteRef}` : "Trip package";
  const detailLines = [
    "PACKAGE DETAILS (text)",
    ...formatQuoteLines(quote),
    "",
    "This is a quote, not a confirmed booking.",
    "Confirm on WhatsApp or cabzii.in to lock the cab."
  ];

  const ops = [];
  const write = (fontSize, y, text) => {
    ops.push(`BT /F1 ${fontSize} Tf 1 0 0 1 48 ${y} Tm (${pdfEscape(text)}) Tj ET`);
  };
  write(18, 780, heading);
  write(12, 758, sub);
  let y = 720;
  detailLines.forEach((line) => {
    write(11, y, line || " ");
    y -= 18;
  });

  const stream = ops.join("\n");
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  add(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets[i + 1] = Buffer.byteLength(chunks.join(""), "utf8");
    chunks.push(`${i + 1} 0 obj\n${body}\nendobj\n`);
  });
  const xrefStart = Buffer.byteLength(chunks.join(""), "utf8");
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(xref);
  chunks.push(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  return Buffer.from(chunks.join(""), "utf8");
}

module.exports = { buildQuotePdfBuffer };
