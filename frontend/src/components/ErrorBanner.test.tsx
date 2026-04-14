import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
  it("renders nothing when message is null", () => {
    const { container } = render(<ErrorBanner message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an alert with the message text", () => {
    render(<ErrorBanner message="Something went wrong" />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Something went wrong");
  });

  it("updates when the message changes from null to a string", () => {
    const { rerender } = render(<ErrorBanner message={null} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<ErrorBanner message="Now there is an error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Now there is an error");
  });
});
