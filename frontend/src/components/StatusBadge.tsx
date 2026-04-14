import type { StatusType } from "../types";

const STATUS_STYLES: Record<NonNullable<StatusType>, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

interface Props {
  status: StatusType | null;
}

export function StatusBadge({ status }: Props) {
  const styles = status ? STATUS_STYLES[status] : "bg-gray-100 text-gray-500";
  const label = status ?? "Unknown";

  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}
