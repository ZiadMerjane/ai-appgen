"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import { formatUTC } from "@/lib/date";
import type { AppSpec } from "@/lib/spec";

type GenerationInfo = {
  slug: string;
  path: string;
  createdAt: string;
};

type PromptFormProps = {
  lastGenerations: GenerationInfo[];
};

type Toast = {
  message: string;
  variant: "success" | "error" | "info";
};

export default function PromptForm({ lastGenerations }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const [spec, setSpec] = useState<AppSpec | null>(null);
  const [specJson, setSpecJson] = useState<string>("");
  const [generation, setGeneration] = useState<GenerationInfo | null>(null);
  const [recent, setRecent] = useState<GenerationInfo[]>(lastGenerations.slice(0, 3));
  const [planning, setPlanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
const [toast, setToast] = useState<Toast | null>(null);
  const [ghAvailable, setGhAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let active = true;
    const detectGh = async () => {
      try {
        const response = await fetch("/api/gh");
        const payload = await response.json();
        if (active) {
          setGhAvailable(Boolean(payload?.available));
        }
      } catch (error) {
        console.warn("Failed to detect gh CLI", error);
        if (active) {
          setGhAvailable(false);
        }
      }
    };

    detectGh();
    return () => {
      active = false;
    };
  }, []);

  const downloadUrl = useMemo(() => {
    if (!generation) return null;
    return `/api/export?slug=${encodeURIComponent(generation.slug)}`;
  }, [generation]);

  const ghButtonLabel = useMemo(() => {
    if (ghAvailable === null) {
      return "Checking gh…";
    }
    return ghAvailable ? "Run now" : "Copy commands";
  }, [ghAvailable]);

  const copyText = useCallback(
    async (text: string, successMessage: string) => {
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          await navigator.clipboard.writeText(text);
          setToast({ message: successMessage, variant: "success" });
          return;
        }
      } catch (error) {
        console.warn("Clipboard write failed", error);
      }

      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setToast({ message: successMessage, variant: "success" });
      } catch (error) {
        console.error("Clipboard fallback failed", error);
        setToast({
          message: "Unable to copy to clipboard. Copy manually instead.",
          variant: "error",
        });
      }
    },
    [],
  );

  const buildGitCommands = useCallback(
    (slug: string) =>
      [
        "git init",
        "git add .",
        'git commit -m "Initial AI-generated app"',
        `gh repo create ${slug} --public --source=. --remote=origin --push`,
      ].join("\n"),
    [],
  );

  const copyFolderPath = useCallback(
    (path: string) => copyText(path, "Folder path copied to clipboard."),
    [copyText],
  );

  const copyGhCommands = useCallback(
    (info: GenerationInfo) => {
      const commands = buildGitCommands(info.slug);
      const successMessage = ghAvailable
        ? "Commands copied. Run them inside the generated folder to push now."
        : "Commands copied. Install the GitHub CLI to push when ready.";
      void copyText(commands, successMessage);
    },
    [buildGitCommands, copyText, ghAvailable],
  );

  async function handlePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) {
      setToast({ message: "Please enter a prompt first.", variant: "info" });
      return;
    }
    setPlanning(true);
    setSpec(null);
    setSpecJson("");
    setGeneration(null);

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const payload = await response.json();

      if (!response.ok) {
        const message = payload?.error ?? "Planner returned an error.";
        throw new Error(message);
      }

      setSpec(payload as AppSpec);
      setSpecJson(JSON.stringify(payload, null, 2));
      setToast({ message: "Planner generated a spec.", variant: "success" });
    } catch (error) {
      console.error(error);
      setToast({
        message: error instanceof Error ? error.message : "Failed to call planner.",
        variant: "error",
      });
    } finally {
      setPlanning(false);
    }
  }

  async function handleGenerate() {
    if (!spec) {
      setToast({
        message: "Plan first to generate a spec.",
        variant: "info",
      });
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const payload = await response.json();

      if (!response.ok) {
        const message = payload?.error ?? "Generator returned an error.";
        throw new Error(message);
      }

      const info: GenerationInfo = {
        slug: payload.slug,
        path: payload.outputDir,
        createdAt: new Date().toISOString(),
      };

      setGeneration(info);
      setRecent((current) => [info, ...current.filter((item) => item.slug !== info.slug)].slice(0, 3));
      setToast({
        message: `Generated project at ${info.path}`,
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      setToast({
        message: error instanceof Error ? error.message : "Failed to generate project.",
        variant: "error",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (!downloadUrl || !generation) {
      setToast({ message: "Generate an app before downloading.", variant: "info" });
      return;
    }

    setDownloading(true);
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error ?? `Download failed with status ${response.status}`;
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${generation.slug}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setToast({ message: "Download started.", variant: "success" });
    } catch (error) {
      console.error(error);
      setToast({
        message: error instanceof Error ? error.message : "Failed to download ZIP.",
        variant: "error",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-10">
      {toast ? (
        <div
          role="status"
          className={clsx(
            "fixed right-6 top-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-opacity",
            toast.variant === "success" && "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40",
            toast.variant === "error" && "bg-red-500/20 text-red-200 border border-red-400/40",
            toast.variant === "info" && "bg-slate-700/60 text-slate-100 border border-slate-500/60",
          )}
        >
          {toast.message}
        </div>
      ) : null}

      <form onSubmit={handlePlan} className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-8 shadow-xl">
        <div className="space-y-2">
          <label htmlFor="prompt" className="text-sm font-medium text-slate-200">
            Describe your app
          </label>
          <textarea
            id="prompt"
            name="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Tasks app with title + done"
            rows={4}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={planning}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              "border border-emerald-500/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30",
              planning && "cursor-not-allowed opacity-60",
            )}
          >
            {planning ? "Planning…" : "Plan"}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !spec}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              "border border-sky-500/40 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30",
              (generating || !spec) && "cursor-not-allowed opacity-50",
            )}
          >
            {generating ? "Generating…" : "Generate"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || !generation}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700/80",
              (downloading || !generation) && "cursor-not-allowed opacity-50",
            )}
          >
            {downloading ? "Preparing…" : "Download ZIP"}
          </button>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <header className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">Planner output</h2>
            {spec ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                Ready
              </span>
            ) : null}
          </header>
          <pre className="max-h-80 overflow-auto rounded-xl border border-slate-900 bg-slate-950/90 p-4 text-xs text-slate-300">
            {specJson || "Run the planner to preview the generated spec."}
          </pre>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <header className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">Generation details</h2>
            {generation ? (
              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
                {generation.slug}
              </span>
            ) : null}
          </header>
          {generation ? (
            <div className="space-y-4 text-sm text-slate-300">
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-400">Slug</span>
                <span className="font-mono text-xs text-slate-200">{generation.slug}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-400">Absolute path</span>
                <span className="flex-1 break-all font-mono text-xs text-slate-200">{generation.path}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className={clsx(
                    "rounded-md border px-3 py-2 text-xs font-medium transition",
                    "border-sky-500/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
                    downloading && "cursor-not-allowed opacity-50",
                  )}
                >
                  {downloading ? "Preparing…" : "Download ZIP"}
                </button>
                <button
                  type="button"
                  onClick={() => copyFolderPath(generation.path)}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  Copy folder path
                </button>
                <button
                  type="button"
                  onClick={() => copyGhCommands(generation)}
                  disabled={ghAvailable === null}
                  className={clsx(
                    "rounded-md border px-3 py-2 text-xs font-medium transition",
                    ghAvailable ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25" : "border-slate-700 text-slate-200 hover:bg-slate-800",
                    ghAvailable === null && "cursor-not-allowed opacity-50",
                  )}
                >
                  {ghButtonLabel}
                </button>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-400"
                  title="Run Git commands from inside the generated folder after copying them."
                >
                  ?
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Download endpoint: <span className="break-all font-mono text-slate-300">{downloadUrl}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Generate an app to see details.</p>
          )}
        </section>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Recent generations</h2>
          <span className="text-xs text-slate-500">Showing up to 3 folders from /generated</span>
        </header>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No generated apps yet. Create one to see it here.</p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-300">
            {recent.map((item) => (
              <li
                key={item.slug}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700/80"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-100">{item.slug}</p>
                    <p className="text-xs text-slate-500">{item.path}</p>
                  </div>
                  <time className="text-xs text-slate-500" dateTime={item.createdAt}>
                    {formatUTC(item.createdAt)}
                  </time>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => copyFolderPath(item.path)}
                    className="rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                  >
                    Copy folder path
                  </button>
                  <button
                    type="button"
                    onClick={() => copyGhCommands(item)}
                    disabled={ghAvailable === null}
                    className={clsx(
                      "rounded-md border px-3 py-2 text-xs font-medium transition",
                      ghAvailable ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25" : "border-slate-700 text-slate-200 hover:bg-slate-800",
                      ghAvailable === null && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {ghButtonLabel}
                  </button>
                  <a
                    href={`/api/export?slug=${encodeURIComponent(item.slug)}`}
                    className="rounded-md border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-medium text-sky-100 hover:bg-sky-500/25"
                  >
                    Download ZIP
                  </a>
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-400"
                    title="Run Git commands from inside the generated folder after copying them."
                  >
                    ?
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
