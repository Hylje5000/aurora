import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockAsSVG = vi.fn(() => "<svg>mock</svg>");
const MockSymbol = vi.fn(() => ({ asSVG: mockAsSVG }));

vi.mock("milsymbol", () => ({ default: { Symbol: MockSymbol } }));

describe("createMilsymbolImage", () => {
  let OriginalImage: typeof Image;

  beforeEach(() => {
    OriginalImage = globalThis.Image;
    mockAsSVG.mockReturnValue("<svg>mock</svg>");
    MockSymbol.mockClear();
    mockAsSVG.mockClear();
  });

  afterEach(() => {
    globalThis.Image = OriginalImage;
  });

  it("resolves with an HTMLImageElement whose src is a data URL", async () => {
    const fakeImg = {} as HTMLImageElement;
    globalThis.Image = vi.fn(() => {
      setTimeout(() => {
        if (typeof fakeImg.onload === "function")
          fakeImg.onload(new Event("load"));
      }, 0);
      return fakeImg;
    }) as unknown as typeof Image;

    const { createMilsymbolImage } = await import("@/lib/milsymbol");
    const result = await createMilsymbolImage({ sidc: "SFGPUUSR-------" });

    expect(fakeImg.src).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(result).toBe(fakeImg);
  });

  it("passes fillColor and uniqueDesignation to ms.Symbol", async () => {
    const fakeImg = {} as HTMLImageElement;
    globalThis.Image = vi.fn(() => {
      setTimeout(() => {
        if (typeof fakeImg.onload === "function")
          fakeImg.onload(new Event("load"));
      }, 0);
      return fakeImg;
    }) as unknown as typeof Image;

    const { createMilsymbolImage } = await import("@/lib/milsymbol");
    await createMilsymbolImage({
      sidc: "SFGPUUSR-------",
      fillColor: "#4ade80",
      uniqueDesignation: "LTE",
      size: 35,
    });

    expect(MockSymbol).toHaveBeenCalledWith("SFGPUUSR-------", {
      size: 35,
      fillColor: "#4ade80",
      uniqueDesignation: "LTE",
    });
  });

  it("uses default size 40 when size is omitted", async () => {
    const fakeImg = {} as HTMLImageElement;
    globalThis.Image = vi.fn(() => {
      setTimeout(() => {
        if (typeof fakeImg.onload === "function")
          fakeImg.onload(new Event("load"));
      }, 0);
      return fakeImg;
    }) as unknown as typeof Image;

    const { createMilsymbolImage } = await import("@/lib/milsymbol");
    await createMilsymbolImage({ sidc: "SFGPUUSR-------" });

    expect(MockSymbol).toHaveBeenCalledWith(
      "SFGPUUSR-------",
      expect.objectContaining({ size: 40 }),
    );
  });

  it("rejects when the image fires onerror", async () => {
    const fakeImg = {} as HTMLImageElement;
    globalThis.Image = vi.fn(() => {
      setTimeout(() => {
        if (typeof fakeImg.onerror === "function")
          fakeImg.onerror(new Event("error"));
      }, 0);
      return fakeImg;
    }) as unknown as typeof Image;

    const { createMilsymbolImage } = await import("@/lib/milsymbol");
    await expect(
      createMilsymbolImage({ sidc: "SFGPUUSR-------" }),
    ).rejects.toBeInstanceOf(Event);
  });
});
