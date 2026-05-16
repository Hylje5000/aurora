"use client";

import { useState, useMemo } from "react";
import ms from "milsymbol";
import {
  MILITARY_SYMBOLS,
  AFFILIATIONS,
  setSidcAffiliation,
  getSidcAffiliation,
} from "@/lib/milsymbolData";

interface SymbolPickerProps {
  selectedSidc: string;
  onChange: (sidc: string) => void;
}

function SymbolIcon({ sidc, size = 20 }: { sidc: string; size?: number }) {
  const svg = useMemo(() => {
    try {
      return new ms.Symbol(sidc, { size }).asSVG();
    } catch {
      return "";
    }
  }, [sidc, size]);

  return (
    <div
      className="flex items-center justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function SymbolPicker({
  selectedSidc,
  onChange,
}: SymbolPickerProps) {
  const [search, setSearch] = useState("");
  const currentAffiliation = getSidcAffiliation(selectedSidc);

  const filteredSymbols = useMemo(() => {
    const s = search.toLowerCase();
    return MILITARY_SYMBOLS.filter((sym) => sym.name.toLowerCase().includes(s));
  }, [search]);

  function handleAffiliationChange(code: string) {
    onChange(setSidcAffiliation(selectedSidc, code));
  }

  function handleSymbolSelect(baseSidc: string) {
    onChange(setSidcAffiliation(baseSidc, currentAffiliation));
  }

  return (
    <div className="flex flex-col gap-3" data-testid="symbol-picker">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Affiliation
        </label>
        <div className="flex gap-1">
          {AFFILIATIONS.map((aff) => (
            <button
              key={aff.code}
              type="button"
              onClick={() => handleAffiliationChange(aff.code)}
              className={`flex-1 px-1 py-1 text-[10px] font-mono border rounded transition-colors ${
                currentAffiliation === aff.code
                  ? "bg-slate-700 border-slate-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
              style={
                currentAffiliation === aff.code
                  ? { boxShadow: `0 0 8px ${aff.color}44` }
                  : {}
              }
            >
              <div
                className="w-1.5 h-1.5 rounded-full mx-auto mb-1"
                style={{ backgroundColor: aff.color }}
              />
              {aff.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Symbol Type
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbols..."
          className="w-full rounded bg-slate-800 border border-slate-600 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-400"
          data-testid="symbol-search"
        />
        <div
          className="grid grid-cols-4 gap-1 mt-1 h-32 overflow-y-auto pr-1 custom-scrollbar scrollbar-thin scrollbar-thumb-slate-700"
          data-testid="symbol-grid"
        >
          {filteredSymbols.map((sym) => {
            const previewSidc = setSidcAffiliation(
              sym.sidc,
              currentAffiliation,
            );
            const isSelected =
              setSidcAffiliation(selectedSidc, "F") ===
              setSidcAffiliation(sym.sidc, "F");

            return (
              <button
                key={sym.name}
                type="button"
                onClick={() => handleSymbolSelect(sym.sidc)}
                className={`flex flex-col items-center gap-1 p-2 rounded border transition-all ${
                  isSelected
                    ? "bg-slate-700 border-slate-400"
                    : "bg-slate-800 border-slate-700 hover:border-slate-600"
                }`}
                title={sym.name}
              >
                <SymbolIcon sidc={previewSidc} size={18} />
                <span className="text-[8px] text-slate-400 truncate w-full text-center">
                  {sym.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
