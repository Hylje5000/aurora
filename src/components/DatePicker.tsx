"use client";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Max days per month — Feb capped at 29 to allow leap years
const MONTH_MAX_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

interface DatePickerProps {
  month: number;
  day: number;
  onChange: (month: number, day: number) => void;
  bare?: boolean;
}

export default function DatePicker({
  month,
  day,
  onChange,
  bare = false,
}: DatePickerProps) {
  const maxDay = MONTH_MAX_DAYS[month - 1];

  function handleMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newMonth = parseInt(e.target.value, 10);
    const newMax = MONTH_MAX_DAYS[newMonth - 1];
    const clampedDay = Math.min(day, newMax);
    onChange(newMonth, clampedDay);
  }

  function handleDayChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(month, parseInt(e.target.value, 10));
  }

  const selectClass =
    "rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500";

  const inner = (
    <div className="flex items-center gap-1">
      <select
        aria-label="Month"
        value={month}
        onChange={handleMonthChange}
        className={selectClass}
      >
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="Day"
        value={day}
        onChange={handleDayChange}
        className={selectClass}
      >
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );

  if (bare) return inner;

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 shadow-lg backdrop-blur-sm">
      {inner}
    </div>
  );
}
