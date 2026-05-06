export interface Filters {
  search: string;
  partOfSpeech: string;
  difficulty: string;
  tag: string;
  showArchived: boolean;
}

export const EMPTY_FILTERS: Filters = {
  search: "",
  partOfSpeech: "",
  difficulty: "",
  tag: "",
  showArchived: false,
};

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  partsOfSpeech: string[];
  difficulties: string[];
  tags: string[];
}

export function FilterBar({
  filters,
  onChange,
  partsOfSpeech,
  difficulties,
  tags,
}: Props) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const isDirty =
    filters.search !== "" ||
    filters.partOfSpeech !== "" ||
    filters.difficulty !== "" ||
    filters.tag !== "" ||
    filters.showArchived;

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:items-end sm:gap-3 lg:grid-cols-4">
        <Field label="Search" className="sm:col-span-2 lg:col-span-2">
          <input
            type="search"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="word or meaning"
            inputMode="search"
            autoCapitalize="off"
            autoCorrect="off"
            className="min-h-touch w-full rounded-md border border-slate-300 bg-white px-3 text-base focus:border-slate-500 focus:outline-none sm:text-sm"
          />
        </Field>
        <Field label="Part of speech">
          <Select
            value={filters.partOfSpeech}
            onChange={(v) => update("partOfSpeech", v)}
            options={partsOfSpeech}
          />
        </Field>
        <Field label="Difficulty">
          <Select
            value={filters.difficulty}
            onChange={(v) => update("difficulty", v)}
            options={difficulties}
          />
        </Field>
        <Field label="Tag">
          <Select
            value={filters.tag}
            onChange={(v) => update("tag", v)}
            options={tags}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-touch items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.showArchived}
            onChange={(e) => update("showArchived", e.target.checked)}
            className="h-4 w-4"
          />
          Show archived
        </label>
        {isDirty && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="inline-flex min-h-touch items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`flex flex-col gap-1 text-xs font-medium text-slate-600 ${
        className ?? ""
      }`}
    >
      {label}
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-touch w-full rounded-md border border-slate-300 bg-white px-2 text-base focus:border-slate-500 focus:outline-none sm:text-sm"
    >
      <option value="">All</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
