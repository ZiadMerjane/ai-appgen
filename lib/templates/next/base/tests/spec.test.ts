import { describe, expect, it } from "vitest";

import { appSpec, originalAppSpec } from "@/lib/spec";

describe("generated spec", () => {
  it("includes at least one entity", () => {
    expect(appSpec.entities.length).toBeGreaterThan(0);
  });

  it("mirrors the original prompt structure", () => {
    expect(originalAppSpec.name).toBeTruthy();
    expect(originalAppSpec.entities.length).toBeGreaterThan(0);
  });
});
