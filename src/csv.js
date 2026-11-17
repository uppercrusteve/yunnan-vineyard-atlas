/*
 * Minimal RFC 4180 CSV reader/writer.
 * Deliberately dependency-free so the same code runs in the browser,
 * in Vitest, and in the build script.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CSV = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function parse(text, options) {
    const opts = Object.assign({ skipEmptyLines: true }, options || {});
    if (typeof text !== "string") throw new TypeError("CSV input must be a string");
    const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    const records = [];
    let record = [];
    let field = "";
    let inQuotes = false;
    let i = 0;

    function endField() {
      record.push(field);
      field = "";
    }

    function endRecord() {
      endField();
      const isEmpty = record.length === 1 && record[0] === "";
      if (!opts.skipEmptyLines || !isEmpty) records.push(record);
      record = [];
    }

    while (i < source.length) {
      const ch = source[i];
      if (inQuotes) {
        if (ch === '"') {
          if (source[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i += 1;
          continue;
        }
        field += ch;
        i += 1;
        continue;
      }
      if (ch === '"' && field === "") {
        inQuotes = true;
        i += 1;
        continue;
      }
      if (ch === ",") {
        endField();
        i += 1;
        continue;
      }
      if (ch === "\r") {
        if (source[i + 1] === "\n") i += 1;
        endRecord();
        i += 1;
        continue;
      }
      if (ch === "\n") {
        endRecord();
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
    }
    if (inQuotes) throw new Error("Unterminated quoted field in CSV");
    if (field !== "" || record.length > 0) endRecord();
    if (records.length === 0) return { headers: [], rows: [] };

    const headers = records[0].map((header) => header.trim());
    if (new Set(headers).size !== headers.length) {
      throw new Error("Duplicate CSV header");
    }
    const rows = records.slice(1).map((cells, index) => {
      if (cells.length !== headers.length) {
        throw new Error(
          "Row " + (index + 2) + " has " + cells.length + " fields, expected " + headers.length
        );
      }
      const row = {};
      headers.forEach((header, column) => {
        row[header] = cells[column];
      });
      return row;
    });
    return { headers, rows };
  }

  function stringify(headers, rows) {
    function cell(value) {
      const text = value == null ? "" : String(value);
      return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    }
    return [headers.map(cell).join(",")]
      .concat(rows.map((row) => headers.map((header) => cell(row[header])).join(",")))
      .join("\r\n");
  }

  return { parse, stringify };
});
