import { describe, expect, it } from "vitest";

import { defaultSpec, ensureSpecDefaults } from "@/lib/spec";

describe("ensureSpecDefaults", () => {
  it("returns default spec when input is empty", () => {
    const result = ensureSpecDefaults({});
    expect(result).toEqual(defaultSpec);
  });

  it("applies defaults for partially defined specs", () => {
    const result = ensureSpecDefaults({
      name: "Inventory",
      entities: [
        {
          name: "Product",
          fields: [{ name: "title", type: "string" }],
        },
      ],
    });

    expect(result).toMatchObject({
      name: "Inventory",
      auth: { emailPassword: true },
    });
    expect(result.entities[0]?.fields.length).toBeGreaterThan(0);
    expect(result.pages.length).toBeGreaterThan(0);
  });

  it("falls back to defaults when provided spec is incomplete", () => {
    const result = ensureSpecDefaults({
      name: "",
      entities: [],
    });

    expect(result).toEqual(defaultSpec);
  });
});
