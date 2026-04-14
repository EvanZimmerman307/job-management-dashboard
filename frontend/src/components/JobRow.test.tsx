import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobRow } from "./JobRow";
import type { Job } from "../types";

const mockJob: Job = {
  id: 1,
  name: "Test Job",
  status: "PENDING",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("JobRow — status editing", () => {
  it("status select is hidden initially", () => {
    render(
      <table><tbody>
        <JobRow job={mockJob} onStatusChange={vi.fn()} onDelete={vi.fn()} onError={vi.fn()} />
      </tbody></table>
    );
    expect(screen.queryByTestId("status-select")).not.toBeInTheDocument();
  });

  it("clicking the pencil reveals the status select", async () => {
    render(
      <table><tbody>
        <JobRow job={mockJob} onStatusChange={vi.fn()} onDelete={vi.fn()} onError={vi.fn()} />
      </tbody></table>
    );
    await userEvent.click(screen.getByTestId("status-edit-button"));
    expect(screen.getByTestId("status-select")).toBeInTheDocument();
  });

  it("changing the select calls onStatusChange with the job id and new status", async () => {
    const onStatusChange = vi.fn().mockResolvedValue(undefined);
    render(
      <table><tbody>
        <JobRow job={mockJob} onStatusChange={onStatusChange} onDelete={vi.fn()} onError={vi.fn()} />
      </tbody></table>
    );
    await userEvent.click(screen.getByTestId("status-edit-button"));
    await userEvent.selectOptions(screen.getByTestId("status-select"), "RUNNING");
    // Wait for isUpdating to go false — badge shows null while updating, then job.status after.
    // This ensures setIsUpdating(false) has fired before the test exits.
    await waitFor(() => expect(screen.getByTestId("status-badge")).toHaveTextContent("PENDING"));
    expect(onStatusChange).toHaveBeenCalledWith(1, "RUNNING");
  });

  it("calls onError when onStatusChange rejects", async () => {
    const onStatusChange = vi.fn().mockRejectedValue(new Error("Network error"));
    const onError = vi.fn();
    render(
      <table><tbody>
        <JobRow job={mockJob} onStatusChange={onStatusChange} onDelete={vi.fn()} onError={onError} />
      </tbody></table>
    );
    await userEvent.click(screen.getByTestId("status-edit-button"));
    await userEvent.selectOptions(screen.getByTestId("status-select"), "RUNNING");
    await waitFor(() => expect(onError).toHaveBeenCalledWith("Network error"));
  });
});

describe("JobRow — delete", () => {
  let onDelete: (id: number) => Promise<void>;
  let onError: (message: string) => void;

  beforeEach(() => {
    onDelete = vi.fn<(id: number) => Promise<void>>().mockResolvedValue(undefined);
    onError = vi.fn();
  });

  it("delete button is hidden before opening the menu", () => {
    render(
      <table><tbody>
        <JobRow job={mockJob} onStatusChange={vi.fn()} onDelete={onDelete} onError={onError} />
      </tbody></table>
    );
    expect(screen.queryByTestId("delete-job-button")).not.toBeInTheDocument();
  });

  it("opening the kebab menu reveals the delete button", async () => {
    render(
      <table><tbody>
        <JobRow job={mockJob} onStatusChange={vi.fn()} onDelete={onDelete} onError={onError} />
      </tbody></table>
    );
    await userEvent.click(screen.getByTestId("job-menu-button"));
    expect(screen.getByTestId("delete-job-button")).toBeInTheDocument();
  });

  it("clicking delete calls onDelete with the job id", async () => {
    render(
      <table><tbody>
        <JobRow job={mockJob} onStatusChange={vi.fn()} onDelete={onDelete} onError={onError} />
      </tbody></table>
    );
    await userEvent.click(screen.getByTestId("job-menu-button"));
    await userEvent.click(screen.getByTestId("delete-job-button"));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(1));
  });

  it("calls onError when onDelete rejects", async () => {
    const failDelete = vi.fn().mockRejectedValue(new Error("Delete failed"));
    render(
      <table><tbody>
        <JobRow job={mockJob} onStatusChange={vi.fn()} onDelete={failDelete} onError={onError} />
      </tbody></table>
    );
    await userEvent.click(screen.getByTestId("job-menu-button"));
    await userEvent.click(screen.getByTestId("delete-job-button"));
    await waitFor(() => expect(onError).toHaveBeenCalledWith("Delete failed"));
  });
});
