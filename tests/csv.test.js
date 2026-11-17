import { describe, expect, it } from "vitest";
import { CSV } from "./helpers.js";

describe("CSV parser", () => {
  it("parses quoted commas, escaped quotes and embedded newlines", () => {
    const { rows } = CSV.parse('a,b,c\r\n"one, two","say ""hi""","line1\nline2"');
    expect(rows).toHaveLength(1);
    expect(rows[0].a).toBe("one, two");
    expect(rows[0].b).toBe('say "hi"');
    expect(rows[0].c).toBe("line1\nline2");
  });

  it("strips a UTF-8 BOM from the first header", () => {
    const { headers } = CSV.parse("﻿id,note\n1,x");
    expect(headers[0]).toBe("id");
  });

  it("skips blank lines", () => {
    const { rows } = CSV.parse("a,b\n1,2\n\n3,4\n");
    expect(rows).toHaveLength(2);
  });

  it("rejects an unterminated quoted field", () => {
    expect(() => CSV.parse('a\n"open')).toThrow(/Unterminated/);
  });

  it("rejects duplicate headers", () => {
    expect(() => CSV.parse("a,a\n1,2")).toThrow(/Duplicate/);
  });

  it("rejects rows with the wrong field count", () => {
    expect(() => CSV.parse("a,b\n1")).toThrow(/expected 2/);
  });

  it("round-trips through stringify", () => {
    const headers = ["id", "note"];
    const rows = [{ id: "1", note: 'comma, quote " and\nnewline' }];
    const { rows: parsed } = CSV.parse(CSV.stringify(headers, rows));
    expect(parsed).toEqual(rows);
  });
});
