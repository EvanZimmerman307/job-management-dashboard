import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateJobForm } from "./CreateJobForm";

describe("CreateJobForm", () => {
  it("calls onSubmit with trimmed name on valid submission", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateJobForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByTestId("job-name-input"), "  My Job  ");
    await userEvent.click(screen.getByTestId("create-job-submit"));

    // Wait for the input to clear — that state update fires after await onSubmit() resolves,
    // so it guarantees all async work (and the act boundary) has settled before we assert.
    await waitFor(() => expect(screen.getByTestId("job-name-input")).toHaveValue(""));
    expect(onSubmit).toHaveBeenCalledWith("My Job");
  });

  it("shows validation error and does not call onSubmit when name is empty", async () => {
    const onSubmit = vi.fn();
    render(<CreateJobForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByTestId("create-job-submit"));

    expect(screen.getByText("Job name cannot be empty.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error for whitespace-only input", async () => {
    const onSubmit = vi.fn();
    render(<CreateJobForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByTestId("job-name-input"), "   ");
    await userEvent.click(screen.getByTestId("create-job-submit"));

    expect(screen.getByText("Job name cannot be empty.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the input after successful submission", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateJobForm onSubmit={onSubmit} />);

    const input = screen.getByTestId("job-name-input");
    await userEvent.type(input, "My Job");
    await userEvent.click(screen.getByTestId("create-job-submit"));

    expect(input).toHaveValue("");
  });

  it("disables the submit button while submission is in flight", async () => {
    let resolveSubmit!: () => void;
    const onSubmit = vi.fn(
      () => new Promise<void>((resolve) => { resolveSubmit = resolve; })
    );
    render(<CreateJobForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByTestId("job-name-input"), "My Job");
    await userEvent.click(screen.getByTestId("create-job-submit"));

    expect(screen.getByTestId("create-job-submit")).toBeDisabled();
    resolveSubmit();
    await waitFor(() => expect(screen.getByTestId("create-job-submit")).not.toBeDisabled());
  });
});
