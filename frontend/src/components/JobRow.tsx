import { useEffect, useRef, useState } from "react";

import type { Job, StatusType } from "../types";
import { StatusBadge } from "./StatusBadge";

const STATUS_OPTIONS: StatusType[] = ["PENDING", "RUNNING", "COMPLETED", "FAILED"];

interface Props {
  job: Job;
  onStatusChange: (id: number, status: StatusType) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onError: (message: string) => void;
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3 w-3"
    >
      <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.75 9.775a1.75 1.75 0 0 0-.468.83l-.625 2.5a.75.75 0 0 0 .916.916l2.5-.625a1.75 1.75 0 0 0 .83-.468l7.263-7.263a1.75 1.75 0 0 0 0-2.475ZM4.922 10.628l6.79-6.79.97.97-6.79 6.79-.97-.97Zm-.696 1.42.46-1.836.97.97-1.836.46.406-.406Z" />
    </svg>
  );
}

export function JobRow({ job, onStatusChange, onDelete, onError }: Props) {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const kebabRef = useRef<HTMLButtonElement>(null);

  // Close kebab menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as StatusType;
    setIsUpdating(true);
    setIsEditingStatus(false);
    try {
      await onStatusChange(job.id, newStatus);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    setIsMenuOpen(false);
    setIsDeleting(true);
    try {
      await onDelete(job.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete job.");
      setIsDeleting(false);
    }
  }

  return (
    <tr
      data-testid="job-row"
      className={`border-b border-gray-100 last:border-0 ${isDeleting ? "opacity-50" : ""}`}
    >
      <td className="py-3 px-4 text-sm text-gray-900">{job.name}</td>

      {/* Status cell: badge + edit icon, or inline select */}
      <td className="py-3 px-4">
        {isEditingStatus ? (
          <select
            data-testid="status-select"
            autoFocus
            value={job.status ?? "PENDING"}
            onChange={(e) => void handleStatusChange(e)}
            onBlur={() => setIsEditingStatus(false)}
            disabled={isUpdating}
            className="rounded border border-blue-400 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={isUpdating ? null : job.status} />
            <button
              data-testid="status-edit-button"
              onClick={() => setIsEditingStatus(true)}
              disabled={isUpdating || isDeleting}
              aria-label="Edit status"
              className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
            >
              <PencilIcon />
            </button>
          </div>
        )}
      </td>

      <td className="py-3 px-4 text-sm text-gray-500">
        {new Date(job.created_at).toLocaleString()}
      </td>

      {/* Kebab menu cell */}
      <td className="py-3 px-4">
        <div ref={menuRef} className="relative inline-block">
          <button
            ref={kebabRef}
            data-testid="job-menu-button"
            onClick={() => {
              if (kebabRef.current) {
                const r = kebabRef.current.getBoundingClientRect();
                setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
              }
              setIsMenuOpen((o) => !o);
            }}
            disabled={isDeleting}
            aria-label="Job actions"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4"
            >
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>

          {isMenuOpen && (
            <div
              style={{ top: menuPos.top, right: menuPos.right }}
              className="fixed z-50 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
            >
              <button
                data-testid="delete-job-button"
                onClick={() => void handleDelete()}
                className="flex w-full items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete job
              </button>
              <button
                disabled
                title="Coming soon"
                className="flex w-full items-center px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
              >
                View status history
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
