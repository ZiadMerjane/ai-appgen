import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PromptForm from "@/components/PromptForm";

const planResponse = {
  name: "Tasks",
  entities: [
    {
      name: "Task",
      fields: [
        { name: "title", type: "string" },
        { name: "done", type: "bool" },
      ],
    },
  ],
  pages: [],
  auth: { emailPassword: true },
};

describe("PromptForm", () => {
  let fetchMock: vi.Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.spyOn(globalThis as unknown as { fetch: typeof fetch }, "fetch").mockImplementation(
      fetchMock as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plans and generates a project", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/gh")) {
        return Promise.resolve(
          new Response(JSON.stringify({ available: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      if (url.includes("/api/plan")) {
        return Promise.resolve(
          new Response(JSON.stringify(planResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      if (url.includes("/api/generate")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              slug: "tasks-app",
              outputDir: "/tmp/generated/tasks-app",
              spec: planResponse,
              filesWritten: 10,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      throw new Error(`Unexpected fetch to ${url}`);
    });

    render(<PromptForm lastGenerations={[]} />);

    const textarea = screen.getByLabelText(/Describe your app/i);
    await userEvent.type(textarea, "Tasks app with title + done");

    const planButton = screen.getByRole("button", { name: /Plan/i });
    fireEvent.click(planButton);

    await screen.findByText(/"name": "Tasks"/i);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/plan",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    const generateButton = screen.getByRole("button", { name: /Generate/i });
    fireEvent.click(generateButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/generate",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    const slugMatches = await screen.findAllByText("tasks-app");
    expect(slugMatches.length).toBeGreaterThan(0);
    const pathMatches = await screen.findAllByText("/tmp/generated/tasks-app", { exact: false });
    expect(pathMatches.length).toBeGreaterThan(0);

    const downloadButtons = screen.getAllByRole("button", { name: /Download ZIP/i });
    expect(downloadButtons.length).toBeGreaterThan(0);
    downloadButtons.forEach((button) => {
      expect(button).toBeEnabled();
    });
  });
});
