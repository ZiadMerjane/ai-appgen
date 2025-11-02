import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EmptyState from "@/components/EmptyState";

describe("EmptyState", () => {
  it("renders title and optional action", () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Try creating your first record"
        action={<button type="button">Create</button>}
      />,
    );

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Try creating your first record")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});
