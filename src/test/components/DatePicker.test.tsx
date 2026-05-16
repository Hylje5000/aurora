import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DatePicker from "@/components/DatePicker";

describe("DatePicker", () => {
  it("renders a month select and a day select", () => {
    render(<DatePicker month={5} day={16} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Month" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Day" })).toBeInTheDocument();
  });

  it("shows the correct selected month and day", () => {
    render(<DatePicker month={5} day={16} onChange={vi.fn()} />);
    expect(
      (screen.getByRole("combobox", { name: "Month" }) as HTMLSelectElement)
        .value,
    ).toBe("5");
    expect(
      (screen.getByRole("combobox", { name: "Day" }) as HTMLSelectElement)
        .value,
    ).toBe("16");
  });

  it("calls onChange with the new month and unchanged day on month change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker month={5} day={16} onChange={onChange} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Month" }),
      "3",
    );
    expect(onChange).toHaveBeenCalledWith(3, 16);
  });

  it("calls onChange with unchanged month and new day on day change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker month={5} day={16} onChange={onChange} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Day" }),
      "20",
    );
    expect(onChange).toHaveBeenCalledWith(5, 20);
  });

  it("clamps day when switching to a shorter month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // day=31, switch from March (max 31) to April (max 30)
    render(<DatePicker month={3} day={31} onChange={onChange} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Month" }),
      "4",
    );
    expect(onChange).toHaveBeenCalledWith(4, 30);
  });

  it("does not clamp day when switching to a longer month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // day=28, switch from Feb (max 29) to March (max 31) — no clamp
    render(<DatePicker month={2} day={28} onChange={onChange} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Month" }),
      "3",
    );
    expect(onChange).toHaveBeenCalledWith(3, 28);
  });

  it("renders 31 day options for January", () => {
    render(<DatePicker month={1} day={1} onChange={vi.fn()} />);
    const daySelect = screen.getByRole("combobox", {
      name: "Day",
    }) as HTMLSelectElement;
    expect(daySelect.options.length).toBe(31);
  });

  it("renders 29 day options for February", () => {
    render(<DatePicker month={2} day={1} onChange={vi.fn()} />);
    const daySelect = screen.getByRole("combobox", {
      name: "Day",
    }) as HTMLSelectElement;
    expect(daySelect.options.length).toBe(29);
  });

  it("renders 30 day options for April", () => {
    render(<DatePicker month={4} day={1} onChange={vi.fn()} />);
    const daySelect = screen.getByRole("combobox", {
      name: "Day",
    }) as HTMLSelectElement;
    expect(daySelect.options.length).toBe(30);
  });
});
