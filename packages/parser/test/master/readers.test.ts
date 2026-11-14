/**
 * Every reader turns its fixture into the same table (docs/MASTER_DATA_IMPORT.md §3).
 * Word, PDF and Excel fixtures come from `make-fixtures.ps1`; the CSV and JSON
 * ones are the real templates in `templates/`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// The parser does not depend on core; the test uses the real header scoring.
import { autoMatch, headerScore } from "../../../core/src/master/import";
import {
  keyValueTable,
  masterFileType,
  MasterReadError,
  readMasterFile,
  type MasterFileType,
} from "../../src/master";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const load = (p: string) => new Uint8Array(readFileSync(here(p)));
const fixture = (name: string) => load(`./fixtures/${name}`);
const facultyScore = (h: string[]) => headerScore("faculty", h);
const courseScore = (h: string[]) => headerScore("courses", h);
const text = (s: string) => new TextEncoder().encode(s);

const FACULTY_HEADERS = [
  "Short Name",
  "Teacher Name",
  "Designation",
  "Dept.",
  "E-mail",
  "Mobile",
  "Office Room",
];
const FACULTY_ROWS = [
  [
    "DAMR",
    "Dr. Abdul Malek Rahman",
    "Associate Professor",
    "NFE",
    "damr@example.edu",
    "+8801711000001",
    "AB-1: 501",
  ],
  ["SIS", "Sadia Islam Shanta", "Lecturer", "NFE", "sis@example.edu", "01711000002", "AB-1: 502"],
  ["NI", "Nazmul Islam", "Assistant Professor", "ITM", "ni@example.edu", "", ""],
  ["AMT", "Ayesha Mahmud Tania", "Senior Lecturer", "NFE", "", "01711000004", "AB-1: 503"],
  ["FAN", "Farhan Ahmed Nabil", "Lecturer", "NFE", "fan@example.edu", "", "AB-1: 504"],
  ["AS", "Arif Sultan", "Professor", "NFE", "as@example.edu", "01711000006", "AB-1: 505"],
];
const COURSE_HEADERS = ["Course Code", "Course Title", "Credit", "Type"];
const COURSE_ROWS = [
  ["0531-1103", "Food Chemistry", "3", "Theory"],
  ["0531-1104", "Food Chemistry Lab", "1.5", "Lab"],
  ["0222-111", "Bangladesh Studies", "3", "Theory"],
  ["AOL 0223-111", "Art of Living", "2", "Theory"],
  ["0531-2105", "Food Microbiology", "3", "Theory"],
  ["0531-2106", "Food Microbiology Lab", "1.5", "Sessional"],
];

describe("file type", () => {
  it("comes from the extension", () => {
    expect(masterFileType("Faculty List.XLSX")).toBe("xlsx");
    expect(masterFileType("courses.pdf")).toBe("pdf");
    expect(masterFileType("photo.png")).toBeNull();
    expect(masterFileType("noext")).toBeNull();
  });
});

describe.each(["docx", "doc", "pdf"] as MasterFileType[])("%s reader", (type) => {
  it("finds the faculty table under a title and a smaller table", async () => {
    const t = await readMasterFile(fixture(`faculty.${type}`), type, { score: facultyScore });
    expect(t.headers).toEqual(FACULTY_HEADERS);
    expect(t.rows).toEqual(FACULTY_ROWS);
  });

  it("reads the course table", async () => {
    const t = await readMasterFile(fixture(`courses.${type}`), type, { score: courseScore });
    expect(t.headers).toEqual(COURSE_HEADERS);
    expect(t.rows).toEqual(COURSE_ROWS);
  });
});

describe("pdf reader", () => {
  it("says which page the table is on", async () => {
    const t = await readMasterFile(fixture("faculty.pdf"), "pdf", { score: facultyScore });
    expect(t.source).toEqual({ page: 1 });
  });

  it("rejects a file that is not a PDF", async () => {
    await expect(readMasterFile(text("hello"), "pdf", { score: facultyScore })).rejects.toThrow(
      MasterReadError,
    );
  });
});

describe("docx paragraphs", () => {
  it("reads 'Key: Value' blocks when there is no table", async () => {
    const t = await readMasterFile(fixture("faculty-paragraphs.docx"), "docx", {
      score: facultyScore,
    });
    expect(t.headers).toEqual(FACULTY_HEADERS);
    expect(t.rows).toEqual([FACULTY_ROWS[0], FACULTY_ROWS[1], FACULTY_ROWS[2]]);
  });

  it("starts a new record when a key repeats without a blank line", () => {
    expect(keyValueTable(["Initial: A", "Name: X", "Initial: B"])?.rows).toEqual([
      ["A", "X"],
      ["B", ""],
    ]);
    expect(keyValueTable(["no pairs here"])).toBeNull();
  });
});

describe("xlsx reader", () => {
  it("picks the best sheet and the header below a title", async () => {
    const t = await readMasterFile(fixture("master.xlsx"), "xlsx", { score: courseScore });
    expect(t.source).toEqual({ sheet: "Courses" });
    expect(t.sheets).toEqual(["Notes", "Faculty", "Courses"]);
    expect(t.headers).toEqual(COURSE_HEADERS);
    expect(t.rows).toEqual(COURSE_ROWS);
  });

  it("uses the sheet the admin picked", async () => {
    const t = await readMasterFile(fixture("master.xlsx"), "xlsx", {
      score: courseScore,
      sheet: "Faculty",
    });
    expect(t.source).toEqual({ sheet: "Faculty" });
    expect(t.rows).toEqual(FACULTY_ROWS);
  });
});

describe("csv reader", () => {
  it("reads the faculty template", async () => {
    const t = await readMasterFile(load("../../../../templates/faculty_template.csv"), "csv", {
      score: facultyScore,
    });
    expect(t.headers.slice(0, 3)).toEqual(["initial", "department", "classes_per_week"]);
    expect(t.rows).toHaveLength(79);
    expect(t.rows[0]!.slice(0, 3)).toEqual(["AMT", "NFE", "12"]);
    expect(Object.keys(autoMatch("faculty", t.headers))).toContain("initial");
  });

  it("detects ; and tab, removes the BOM and keeps quoted commas", async () => {
    const semi = await readMasterFile(text('﻿Code;Title\r\n0531-1103;"Food, Chemistry"'), "csv", {
      score: courseScore,
    });
    expect(semi.headers).toEqual(["Code", "Title"]);
    expect(semi.rows).toEqual([["0531-1103", "Food, Chemistry"]]);
    const tab = await readMasterFile(text("Code\tCredit\n0531-1104\t1.5\n\n"), "csv", {
      score: courseScore,
    });
    expect(tab.rows).toEqual([["0531-1104", "1.5"]]);
  });

  it("names empty headers that have data and drops empty columns", async () => {
    const t = await readMasterFile(text("Code,,,Title\n0531-1103,x,,Food"), "csv", {
      score: courseScore,
    });
    expect(t.headers).toEqual(["Code", "Column 2", "Title"]);
    expect(t.rows).toEqual([["0531-1103", "x", "Food"]]);
  });

  it("rejects an empty file", async () => {
    await expect(readMasterFile(text("  \n"), "csv", { score: courseScore })).rejects.toThrow(
      "empty",
    );
  });
});

describe("json reader", () => {
  it("reads the example files", async () => {
    const f = await readMasterFile(load("../../../../templates/faculty_example.json"), "json", {
      score: facultyScore,
    });
    expect(f.headers).toContain("is_guest");
    expect(f.rows[1]![f.headers.indexOf("is_guest")]).toBe("yes");
    const c = await readMasterFile(load("../../../../templates/courses_example.json"), "json", {
      score: courseScore,
    });
    expect(c.rows[0]![c.headers.indexOf("credit")]).toBe("3");
  });

  it("takes the list named after the import kind", async () => {
    const both = text(
      JSON.stringify({ faculty: [{ initial: "A" }], courses: [{ code: "0531-1103" }] }),
    );
    const t = await readMasterFile(both, "json", { score: courseScore, kind: "courses" });
    expect(t).toMatchObject({ headers: ["code"], rows: [["0531-1103"]] });
  });

  it("rejects broken JSON", async () => {
    await expect(readMasterFile(text("{"), "json", { score: courseScore })).rejects.toThrow(
      "badJson",
    );
  });
});
