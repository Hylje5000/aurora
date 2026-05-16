"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface SummaryModalProps {
  open: boolean;
  summary: string | null;
  onClose: () => void;
}

export default function SummaryModal({
  open,
  summary,
  onClose,
}: SummaryModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="summary-modal-backdrop"
    >
      <div
        className="w-[32rem] max-h-[80vh] flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl p-4 outline-none"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        ref={contentRef}
        data-testid="summary-modal"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/60 flex-shrink-0">
          <h2 className="text-xs font-mono tracking-widest uppercase text-slate-400">
            Tactical Executive Summary
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1"
            aria-label="Close summary modal"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto pr-2 custom-scrollbar text-xs font-mono text-slate-300 leading-relaxed space-y-4">
          {summary ? (
            <ReactMarkdown
              components={{
                h1: ({ node: _node, ...props }) => (
                  <h1
                    className="text-sm font-bold text-white uppercase mt-4 mb-2"
                    {...props}
                  />
                ),
                h2: ({ node: _node, ...props }) => (
                  <h2
                    className="text-xs font-bold text-blue-400 uppercase mt-3 mb-1 tracking-wider"
                    {...props}
                  />
                ),
                h3: ({ node: _node, ...props }) => (
                  <h3
                    className="text-[11px] font-bold text-slate-200 mt-2 mb-1"
                    {...props}
                  />
                ),
                p: ({ node: _node, ...props }) => (
                  <p className="mb-2" {...props} />
                ),
                ul: ({ node: _node, ...props }) => (
                  <ul
                    className="list-disc pl-4 mb-2 space-y-1 marker:text-slate-600"
                    {...props}
                  />
                ),
                ol: ({ node: _node, ...props }) => (
                  <ol
                    className="list-decimal pl-4 mb-2 space-y-1 marker:text-slate-600"
                    {...props}
                  />
                ),
                li: ({ node: _node, ...props }) => (
                  <li className="" {...props} />
                ),
                strong: ({ node: _node, ...props }) => (
                  <strong className="font-bold text-white" {...props} />
                ),
              }}
            >
              {summary}
            </ReactMarkdown>
          ) : (
            <p className="text-slate-500 italic text-center py-8">
              No summary available.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-3 mt-3 border-t border-slate-700/60 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            data-testid="summary-modal-close"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
