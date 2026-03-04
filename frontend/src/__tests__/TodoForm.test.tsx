import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import TodoForm from "../components/TodoForm";

describe("TodoForm", () => {
  it("renders input and submit button", () => {
    render(<TodoForm onSubmit={() => {}} />);
    expect(screen.getByLabelText("Todo title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("calls onSubmit with trimmed title and empty tags, then clears input", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<TodoForm onSubmit={onSubmit} />);
    const input = screen.getByLabelText("Todo title");

    await user.type(input, "  Buy groceries  ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith("Buy groceries", []);
    expect(input).toHaveValue("");
  });

  it("does not submit empty title", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<TodoForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
