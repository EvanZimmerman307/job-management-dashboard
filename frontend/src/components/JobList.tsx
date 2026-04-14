import type { Job, StatusType } from "../types";
import { JobRow } from "./JobRow";

const PAGE_SIZE = 20;
const STATUS_OPTIONS: StatusType[] = ["PENDING", "RUNNING", "COMPLETED", "FAILED"];
const ORDERING_OPTIONS = [
  { value: "-created_at", label: "Newest first" },
  { value: "created_at",  label: "Oldest first" },
  { value: "name",        label: "Name A–Z" },
  { value: "-name",       label: "Name Z–A" },
];

interface Props {
  jobs: Job[];
  count: number;
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
  isLoading: boolean;
  status: StatusType | null;
  ordering: string;
  onPageChange: (page: number) => void;
  onStatusFilter: (status: StatusType | null) => void;
  onOrderingChange: (ordering: string) => void;
  onStatusChange: (id: number, status: StatusType) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onError: (message: string) => void;
}

export function JobList({
  jobs,
  count,
  page,
  hasNext,
  hasPrev,
  isLoading,
  status,
  ordering,
  onPageChange,
  onStatusFilter,
  onOrderingChange,
  onStatusChange,
  onDelete,
  onError,
}: Props) {
  const totalPages = Math.ceil(count / PAGE_SIZE) || 1;

  return (
    <div>
      {/* Filter / sort toolbar */}
      <div className="mb-3 flex items-center gap-3">
        <select
          data-testid="status-filter"
          value={status ?? ""}
          onChange={(e) => onStatusFilter((e.target.value as StatusType) || null)}
          className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          data-testid="ordering-select"
          value={ordering}
          onChange={(e) => onOrderingChange(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {ORDERING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {count} {count === 1 ? "job" : "jobs"} total
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="text-xs text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No jobs yet. Create one above.
          </div>
        ) : (
          <table data-testid="job-list" className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Name
                </th>
                <th className="py-2 px-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="py-2 px-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Created
                </th>
                <th className="py-2 px-4 w-10" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                  onError={onError}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
