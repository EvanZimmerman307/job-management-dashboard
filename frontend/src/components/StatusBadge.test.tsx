import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";
import type { StatusType } from "../types";

describe("StatusBadge", () => {
  const statuses: StatusType[] = ["PENDING", "RUNNING", "COMPLETED", "FAILED"];

  it.each(statuses)("renders %s text for status %s", (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent(status);
  });

  it("renders 'Unknown' when status is null", () => {
    render(<StatusBadge status={null} />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Unknown");
  });
});
