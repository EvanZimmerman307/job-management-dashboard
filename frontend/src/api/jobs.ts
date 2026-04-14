import type { Job, PaginatedResponse, StatusType } from "../types";

const BASE = "/api";

export async function fetchJobs(
  page: number,
  status?: StatusType | null,
  ordering?: string,
  pageSize = 20,
): Promise<PaginatedResponse<Job>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status) params.set("status", status);
  if (ordering) params.set("ordering", ordering);
  const res = await fetch(`${BASE}/jobs/?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.status}`);
  return res.json() as Promise<PaginatedResponse<Job>>;
}

export async function createJob(name: string): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const body = (await res.json()) as Record<string, string[]>;
    const message =
      Object.values(body).flat().join(" ") || "Failed to create job.";
    throw new Error(message);
  }
  return res.json() as Promise<Job>;
}

export async function updateJobStatus(
  id: number,
  status: StatusType,
): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = (await res.json()) as Record<string, string[]>;
    const message =
      Object.values(body).flat().join(" ") || "Failed to update status.";
    throw new Error(message);
  }
  return res.json() as Promise<Job>;
}

export async function deleteJob(id: number): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete job: ${res.status}`);
}
