export type StatusType = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Job {
  id: number;
  name: string;
  status: StatusType | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
