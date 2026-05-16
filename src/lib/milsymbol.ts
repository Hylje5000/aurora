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

/**
 * Extracts unique SIDCs from features and ensures they are registered as images in Mapbox.
 */
export async function ensureMilsymbolImages(
  map: {
    hasImage: (id: string) => boolean;
    addImage: (id: string, image: HTMLImageElement) => void;
  },
  features: GeoJSON.Feature[],
): Promise<void> {
  const sidcs = new Set<string>();
  for (const f of features) {
    const props = f.properties?.properties as
      | Record<string, unknown>
      | undefined;
    const sidc = props?.sidc as string | undefined;
    if (sidc) sidcs.add(sidc);
  }

  const promises = Array.from(sidcs)
    .filter((sidc) => !map.hasImage(sidc))
    .map(async (sidc) => {
      try {
        const img = await createMilsymbolImage({ sidc, size: 40 });
        map.addImage(sidc, img);
      } catch (err) {
        console.error(
          `Failed to register milsymbol image for SIDC: ${sidc}`,
          err,
        );
      }
    });

  await Promise.all(promises);
}
