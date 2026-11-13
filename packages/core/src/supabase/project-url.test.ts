import { describe, expect, it } from "vitest";
import { supabaseProjectUrl } from "./project-url";

describe("supabaseProjectUrl", () => {
  it("keeps only the origin", () => {
    const origin = "https://abc.supabase.co";
    expect(supabaseProjectUrl(origin)).toBe(origin);
    expect(supabaseProjectUrl(`${origin}/`)).toBe(origin);
    expect(supabaseProjectUrl(`${origin}/rest/v1/`)).toBe(origin);
    expect(supabaseProjectUrl(` ${origin}/auth/v1 `)).toBe(origin);
    expect(supabaseProjectUrl("http://127.0.0.1:54321/rest/v1")).toBe("http://127.0.0.1:54321");
  });

  it("rejects values that are not URLs", () => {
    expect(() => supabaseProjectUrl("abc.supabase.co")).toThrow();
    expect(() => supabaseProjectUrl("ftp://abc.supabase.co")).toThrow();
  });
});
