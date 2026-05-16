"use client";

const PARTY_COLORS: Record<string, string> = {
  KOK: "#1D5091",
  PS: "#003580",
  SDP: "#CC0000",
  KESK: "#00873E",
  VIHR: "#82B300",
  VAS: "#D32F2F",
  RKP: "#FFD700",
  KD: "#003F87",
  LIIKE: "#F06400",
};
const OTHER_COLOR = "#64748B";
const MIN_SHARE = 2;
const SIZE = 160;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 70;

function polarToXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

interface Slice {
  party: string;
  share: number;
  color: string;
}

function buildSlices(data: Record<string, number>): Slice[] {
  let otherShare = 0;
  const main: Slice[] = [];

  for (const [party, share] of Object.entries(data)) {
    if (share < MIN_SHARE) {
      otherShare += share;
    } else {
      main.push({ party, share, color: PARTY_COLORS[party] ?? OTHER_COLOR });
    }
  }

  main.sort((a, b) => b.share - a.share);
  if (otherShare > 0) {
    main.push({ party: "Other", share: otherShare, color: OTHER_COLOR });
  }
  return main;
}

interface Props {
  data: Record<string, number>;
}

export default function ElectionPieChart({ data }: Props) {
  const slices = buildSlices(data);
  if (slices.length === 0) return null;

  const total = slices.reduce((s, sl) => s + sl.share, 0);
  if (total === 0) return null;

  const top4 = slices.slice(0, 4);

  // Single-slice edge case: draw a full circle
  if (slices.length === 1) {
    return (
      <div className="mt-3">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-label="election results pie chart"
        >
          <circle cx={CX} cy={CY} r={R} fill={slices[0].color} />
        </svg>
        <PartyList parties={top4} />
      </div>
    );
  }

  let currentAngle = 0;
  const paths = slices.map((sl) => {
    const sweep = (sl.share / total) * 360;
    const start = polarToXY(currentAngle, R);
    const end = polarToXY(currentAngle + sweep, R);
    const largeArc = sweep > 180 ? 1 : 0;
    const d = [
      `M ${CX} ${CY}`,
      `L ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
      "Z",
    ].join(" ");
    currentAngle += sweep;
    return <path key={sl.party} d={d} fill={sl.color} />;
  });

  return (
    <div className="mt-3">
      <div className="mb-1 text-slate-400">2023 Election</div>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-label="election results pie chart"
      >
        {paths}
      </svg>
      <PartyList parties={top4} />
    </div>
  );
}

function PartyList({ parties }: { parties: Slice[] }) {
  return (
    <div className="mt-2 space-y-1">
      {parties.map((sl) => (
        <div key={sl.party} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: sl.color }}
          />
          <span className="w-16 truncate text-slate-300">{sl.party}</span>
          <span className="text-slate-400">{sl.share.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}
