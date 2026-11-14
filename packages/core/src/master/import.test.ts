import { describe, expect, it } from "vitest";
import {
  applyPlan,
  autoMatch,
  buildPreview,
  headerKey,
  headerScore,
  importObjectPath,
  invalidRowsCsv,
  presetMapping,
  tableToJson,
  templateTable,
  toCsv,
  type ExistingData,
  type ImportTable,
} from "./import";

const options = { clearEmpty: false, skipInvalid: true };

const existing: ExistingData = {
  departments: ["NFE", "ITM"],
  homeDepartment: "NFE",
  faculty: [
    {
      id: "f1",
      initial: "DAMR",
      department: null,
      full_name: "Old Name",
      designation: "Lecturer",
      email: "old@diu.edu.bd",
      phone: null,
      office_room: null,
      consultation_hours: null,
      status: "active",
      is_guest: false,
    },
    {
      id: "f2",
      initial: "NI",
      department: "ITM",
      full_name: "Guest",
      designation: null,
      email: null,
      phone: null,
      office_room: null,
      consultation_hours: null,
      status: "active",
      is_guest: true,
    },
  ],
  courses: [
    {
      id: "c1",
      code: "0531-1103",
      title: "Food Chemistry",
      title_bn: null,
      credit: 3,
      type: "theory",
      offering_department: "NFE",
    },
  ],
};

describe("header matching", () => {
  it("ignores case, spaces, dots, underscores and brackets", () => {
    expect(headerKey("E-mail")).toBe("email");
    expect(headerKey(" Dept. ")).toBe("dept");
    expect(headerKey("Title (BN)")).toBe("titlebn");
    expect(headerKey("office_room")).toBe("officeroom");
  });

  it("matches faculty headers from synonyms, each header once", () => {
    const m = autoMatch("faculty", [
      "Short Name",
      "Teacher Name",
      "Position",
      "Dept.",
      "E-mail",
      "Mobile",
      "Chamber",
      "Office Hours",
      "classes_per_week",
    ]);
    expect(m).toEqual({
      initial: "Short Name",
      full_name: "Teacher Name",
      designation: "Position",
      department: "Dept.",
      email: "E-mail",
      phone: "Mobile",
      office_room: "Chamber",
      consultation_hours: "Office Hours",
    });
  });

  it("matches the template headers and Bangla headers", () => {
    expect(
      autoMatch("courses", [
        "code",
        "detected_type",
        "sessions_per_week",
        "title",
        "title_bn",
        "credit",
        "type",
        "offering_department",
      ]),
    ).toEqual({
      code: "code",
      title: "title",
      title_bn: "title_bn",
      credit: "credit",
      type: "type",
      offering_department: "offering_department",
    });
    expect(autoMatch("faculty", ["সংক্ষিপ্ত নাম", "নাম", "পদবি"])).toEqual({
      initial: "সংক্ষিপ্ত নাম",
      full_name: "নাম",
      designation: "পদবি",
    });
    expect(headerScore("courses", ["Course Code", "Course Title", "Credit"])).toBe(3);
    expect(headerScore("courses", ["Day", "Time"])).toBe(0);
  });

  it("keeps only the preset columns this file has", () => {
    expect(
      presetMapping("faculty", ["Init", "Name"], { initial: "Init", email: "Mail", bogus: "Name" }),
    ).toEqual({ initial: "Init" });
    expect(presetMapping("faculty", ["Init"], "nonsense")).toEqual({});
  });
});

describe("faculty preview", () => {
  const table: ImportTable = {
    headers: ["Initial", "Name", "Designation", "Email", "Phone", "Dept", "Guest"],
    rows: [
      ["damr", "Dr. A. M. Rahman", "Lecturer", "", "", "", ""], // update: name only
      ["NI(ITM)", "Guest", "", "", "", "", "yes"], // unchanged
      ["SIS", "Sadia Islam", "Lecturer", "SIS@DIU.EDU.BD", "০১৭১১ ০০০০০০", "", "no"], // new
      ["RK", "Guest", "", "", "", "CSE", "yes"], // new + new department
      ["", "No initial", "", "", "", "", ""], // missing key
      ["AB", "", "", "not-an-email", "", "", ""], // bad email
      ["SIS", "Again", "", "", "", "", ""], // duplicate
      ["", "", "", "", "", "", ""], // empty: left out
    ],
  };
  const mapping = autoMatch("faculty", table.headers);
  const p = buildPreview({ kind: "faculty", table, mapping, options, existing });

  it("sorts rows into new / update / unchanged / invalid", () => {
    expect(p.rows.map((r) => [r.line, r.key, r.status])).toEqual([
      [1, "DAMR", "update"],
      [2, "NI(ITM)", "unchanged"],
      [3, "SIS", "new"],
      [4, "RK(CSE)", "new"],
      [5, "", "invalid"],
      [6, "AB", "invalid"],
      [7, "SIS", "invalid"],
    ]);
    expect(p.counts).toEqual({ new: 2, update: 1, unchanged: 1, invalid: 3 });
  });

  it("shows old → new only for changed, non-empty cells", () => {
    expect(p.rows[0]!.changes).toEqual([
      { field: "full_name", from: "Old Name", to: "Dr. A. M. Rahman" },
    ]);
    expect(p.rows[0]!.values).toEqual({ full_name: "Dr. A. M. Rahman" });
    expect(p.rows[0]!.id).toBe("f1");
  });

  it("normalises new rows and defaults the department to the home one", () => {
    expect(p.rows[2]!.values).toEqual({
      initial: "SIS",
      full_name: "Sadia Islam",
      designation: "Lecturer",
      email: "sis@diu.edu.bd",
      phone: "01711000000",
      department: "NFE",
      is_guest: false,
    });
    expect(p.newDepartments).toEqual(["CSE"]);
  });

  it("gives a reason for every invalid row", () => {
    expect(p.rows[4]!.reasons).toEqual([{ code: "missingKey", field: "initial" }]);
    expect(p.rows[5]!.reasons).toEqual([
      { code: "badEmail", field: "email", value: "not-an-email" },
    ]);
    expect(p.rows[6]!.reasons[0]!.code).toBe("duplicateInFile");
  });

  it("clears stored values from empty cells only when asked", () => {
    const cleared = buildPreview({
      kind: "faculty",
      table: { headers: ["Initial", "Email", "Guest"], rows: [["DAMR", "", ""]] },
      mapping: { initial: "Initial", email: "Email", is_guest: "Guest" },
      options: { clearEmpty: true, skipInvalid: true },
      existing,
    });
    expect(cleared.rows[0]!.changes).toEqual([
      { field: "email", from: "old@diu.edu.bd", to: null },
    ]);
  });

  it("builds the apply plan, or refuses when invalid rows must not be skipped", () => {
    const plan = applyPlan(p, options)!;
    expect(plan.departments).toEqual(["CSE"]);
    expect(plan.rows.map((r) => r.id)).toEqual(["f1", null, null]);
    expect(applyPlan(p, { clearEmpty: false, skipInvalid: false })).toBeNull();
  });

  it("exports the invalid rows with an error column", () => {
    const csv = invalidRowsCsv(table, p, (r) => r.code);
    expect(csv.split("\r\n")).toEqual([
      "Initial,Name,Designation,Email,Phone,Dept,Guest,error",
      ",No initial,,,,,,missingKey",
      "AB,,,not-an-email,,,,badEmail",
      "SIS,Again,,,,,,duplicateInFile",
    ]);
  });
});

describe("course preview", () => {
  const table: ImportTable = {
    headers: ["Course Code", "Course Title", "Credit", "Type", "Dept"],
    rows: [
      ["0531-1103", "Food Chemistry", "3.0", "Theory", "NFE"], // unchanged
      ["0531 1104-A", "Food Chemistry Lab", "1.5", "Sessional", "NFE"], // new, section removed
      ["aol0223-111", "Bangla", "abc", "Lecture", ""], // bad credit
      ["0531-1201", "Physics", "3", "Seminar", ""], // bad type
      ["0531-1202", "Maths", "3", "theory", "XYZ"], // unknown department
      ["Food", "", "", "", ""], // bad code
    ],
  };
  const p = buildPreview({
    kind: "courses",
    table,
    mapping: autoMatch("courses", table.headers),
    options,
    existing,
  });

  it("normalises codes, types and credits", () => {
    expect(p.rows.map((r) => [r.key, r.status])).toEqual([
      ["0531-1103", "unchanged"],
      ["0531-1104", "new"],
      ["AOL 0223-111", "invalid"],
      ["0531-1201", "invalid"],
      ["0531-1202", "invalid"],
      ["", "invalid"],
    ]);
    expect(p.rows[1]!.removedSection).toBe("A");
    expect(p.rows[1]!.values).toEqual({
      code: "0531-1104",
      title: "Food Chemistry Lab",
      credit: 1.5,
      type: "lab",
      offering_department: "NFE",
    });
    expect(p.rows.slice(2).map((r) => r.reasons[0]!.code)).toEqual([
      "badCredit",
      "badType",
      "unknownDepartment",
      "badCode",
    ]);
    expect(p.newDepartments).toEqual([]);
  });
});

describe("templates and CSV", () => {
  it("quotes cells that need it", () => {
    expect(toCsv(["a", "b"], [["x,y", 'say "hi"']])).toBe('a,b\r\n"x,y","say ""hi"""');
  });

  it("builds template rows with stored details and JSON without empty cells", () => {
    const t = templateTable("courses", [
      {
        code: "0531-1104",
        detected_type: "lab",
        sessions_per_week: 4,
        title: "Lab",
        title_bn: null,
        credit: 1.5,
        type: "lab",
        offering_department: "NFE",
      },
    ]);
    expect(t.rows[0]).toEqual(["0531-1104", "lab", "4", "Lab", "", "1.5", "lab", "NFE"]);
    expect(tableToJson(t)[0]).toEqual({
      code: "0531-1104",
      detected_type: "lab",
      sessions_per_week: "4",
      title: "Lab",
      credit: "1.5",
      type: "lab",
      offering_department: "NFE",
    });
    // The template imports back: informational columns are not matched.
    expect(Object.keys(autoMatch("courses", t.headers))).not.toContain("detected_type");
  });
});

describe("upload path", () => {
  it("keeps storage keys ASCII and the extension", () => {
    expect(importObjectPath("r1", "Faculty List (v2).XLSX")).toBe("r1/Faculty-List-v2.xlsx");
    expect(importObjectPath("r1", "শিক্ষক তালিকা.pdf")).toBe("r1/file.pdf");
    expect(importObjectPath("r1", "noext")).toBe("r1/noext");
  });
});
