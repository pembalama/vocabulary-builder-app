import { useRef, useState } from "react";
import { parseFile, validateColumns } from "../import/parser";
import { importRows, type ImportSummary } from "../import/importer";

type Status =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "error"; message: string }
  | { kind: "done"; summary: ImportSummary };

export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleFile(file: File) {
    setStatus({ kind: "working" });
    const parsed = await parseFile(file);
    if (!parsed.ok) {
      setStatus({ kind: "error", message: parsed.error });
      return;
    }
    const validation = validateColumns(parsed.rows);
    if (!validation.ok) {
      setStatus({
        kind: "error",
        message: `Missing required columns: ${validation.missing.join(", ")}`,
      });
      return;
    }
    try {
      const summary = await importRows(parsed.rows);
      setStatus({ kind: "done", summary });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Import failed.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-touch items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={status.kind === "working"}
        >
          {status.kind === "working" ? "Importing…" : "Import spreadsheet"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
        <span className="text-xs text-slate-500 sm:text-sm">
          XLSX, XLS, CSV, or TSV. Re-import safely — progress is preserved.
        </span>
      </div>
      {status.kind === "error" && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {status.message}
        </div>
      )}
      {status.kind === "done" && <ImportSummaryView summary={status.summary} />}
    </div>
  );
}

function ImportSummaryView({ summary }: { summary: ImportSummary }) {
  return (
    <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      <div className="font-medium">Import complete</div>
      <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <SummaryStat label="Added" value={summary.added} />
        <SummaryStat label="Updated" value={summary.updated} />
        {summary.unarchived > 0 && (
          <SummaryStat label="Restored" value={summary.unarchived} />
        )}
        <SummaryStat label="Archived" value={summary.archived} />
      </ul>
      {summary.errors.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-emerald-800">
            {summary.errors.length} row issue
            {summary.errors.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-1 list-disc pl-5 text-emerald-900/80">
            {summary.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-baseline gap-1.5">
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="text-xs uppercase tracking-wide text-emerald-800/80">
        {label}
      </span>
    </li>
  );
}
