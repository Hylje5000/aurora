import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import WeatherWidget from "@/components/WeatherWidget";
import type { WeatherStats } from "@/app/api/weather/route";

const MOCK_STATS: WeatherStats = {
  region: "turku",
  month: 5,
  day: 16,
  avgTemp: 12.5,
  minTemp: 7.2,
  maxTemp: 18.1,
  tempSpread: 5.45,
  rainProbability: 40,
  avgRainMm: 3.2,
  sampleSize: 10,
};

const ZERO_STATS: WeatherStats = {
  region: "turku",
  month: 5,
  day: 16,
  avgTemp: 0,
  minTemp: 0,
  maxTemp: 0,
  tempSpread: 0,
  rainProbability: 0,
  avgRainMm: 0,
  sampleSize: 0,
};

function mockFetch(stats: WeatherStats) {
  vi.spyOn(global, "fetch").mockResolvedValueOnce({
    json: () => Promise.resolve(stats),
  } as Response);
}

describe("WeatherWidget", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state initially", () => {
    vi.spyOn(global, "fetch").mockReturnValueOnce(new Promise(() => {}));
    render(<WeatherWidget region="turku" month={5} day={16} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("displays stats after successful fetch", async () => {
    mockFetch(MOCK_STATS);
    render(<WeatherWidget region="turku" month={5} day={16} />);

    await waitFor(() => {
      expect(screen.getByText(/12\.5°C/)).toBeInTheDocument();
    });

    expect(screen.getByText(/18\.1/)).toBeInTheDocument();
    expect(screen.getByText(/7\.2/)).toBeInTheDocument();
    expect(screen.getByText(/40%/)).toBeInTheDocument();
    expect(screen.getByText(/3\.2 mm/)).toBeInTheDocument();
    expect(screen.getByText(/10 yr/)).toBeInTheDocument();
  });

  it("shows fallback when sampleSize is 0", async () => {
    mockFetch(ZERO_STATS);
    render(<WeatherWidget region="turku" month={5} day={16} />);

    await waitFor(() => {
      expect(screen.getByText("No data")).toBeInTheDocument();
    });
  });

  it("shows fallback on fetch error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("network error"));
    render(<WeatherWidget region="turku" month={5} day={16} />);

    await waitFor(() => {
      expect(screen.getByText("No data")).toBeInTheDocument();
    });
  });

  it("refetches when props change", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      json: () => Promise.resolve(MOCK_STATS),
    } as Response);

    const { rerender } = render(
      <WeatherWidget region="turku" month={5} day={16} />,
    );
    await waitFor(() => screen.getByText(/12\.5°C/));

    rerender(<WeatherWidget region="turku" month={6} day={1} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.stringContaining("month=6&day=1"),
      expect.any(Object),
    );
  });

  it("hides avg rain mm row when rainProbability is 0", async () => {
    mockFetch({ ...MOCK_STATS, rainProbability: 0, avgRainMm: 0 });
    render(<WeatherWidget region="turku" month={5} day={16} />);

    await waitFor(() => screen.getByText(/0% rain/));
    expect(screen.queryByText(/mm/)).toBeNull();
  });

  it("bare=true omits the outer panel wrapper", () => {
    vi.spyOn(global, "fetch").mockReturnValueOnce(new Promise(() => {}));
    const { container } = render(
      <WeatherWidget bare region="turku" month={5} day={16} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root?.className).not.toContain("rounded-lg");
    expect(root?.className).not.toContain("border");
  });

  it("bare=true no-data branch omits outer panel wrapper", async () => {
    mockFetch({ ...MOCK_STATS, sampleSize: 0 });
    const { container } = render(
      <WeatherWidget bare region="turku" month={5} day={16} />,
    );
    await waitFor(() => screen.getByText("No data"));
    const root = container.firstElementChild as HTMLElement;
    expect(root?.className).not.toContain("rounded-lg");
  });
});
