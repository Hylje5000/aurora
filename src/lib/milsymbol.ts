import ms from "milsymbol";

export interface MilsymbolOptions {
  sidc: string;
  size?: number;
  fillColor?: string;
  uniqueDesignation?: string;
}

export function createMilsymbolImage(
  opts: MilsymbolOptions,
): Promise<HTMLImageElement> {
  const { sidc, size = 40, fillColor, uniqueDesignation } = opts;
  const sym = new ms.Symbol(sidc, {
    size,
    ...(fillColor ? { fillColor } : {}),
    ...(uniqueDesignation ? { uniqueDesignation } : {}),
  });
  const svg = sym.asSVG();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
