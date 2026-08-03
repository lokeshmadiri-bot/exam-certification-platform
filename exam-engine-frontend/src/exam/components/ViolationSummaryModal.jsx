import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

export default function ViolationSummaryModal({ isOpen, summary, onConfirmSubmit, onClose }) {
  if (!isOpen) return null;

  const warnings = summary ? summary.warnings || 0 : 0;
  const aiFlags = summary && Array.isArray(summary.aiFlags) ? summary.aiFlags : [];

  return (
    <div className="run-overlay fixed inset-0 z-[9999] bg-[#061222]/90 backdrop-blur-md flex items-center justify-center p-6 select-none animate-[fadeIn_0.2s_ease-out]">
      <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[36px_40px] max-w-[480px] w-full shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8A99AE] hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-[#F2A93B]/15 border border-[#F2A93B]/40 text-[#F2A93B] flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h3 className="font-display text-white text-[22px] font-bold mb-2">
          Violation Summary
        </h3>

        <p className="text-[#b9c9e2] text-[13.5px] leading-relaxed mb-5">
          Please review the session telemetry flags logged during your proctored exam before finalizing your submission.
        </p>

        <div className="bg-[#081627] border border-white/10 rounded-xl p-4 mb-6 space-y-3 font-mono text-sm">
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-2">
            <span className="text-[#8A99AE]">Warnings Issued:</span>
            <span className="font-bold text-[#F2A93B]">{warnings}</span>
          </div>

          {aiFlags.length === 0 ? (
            <div className="text-xs text-[#34d27b] pt-1 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>No AI behavioral flags detected.</span>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="text-xs text-[#8A99AE] uppercase tracking-wider font-sans font-semibold">
                AI Flags Summary:
              </div>
              {aiFlags.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-[#e8eefb]">
                  <span className="capitalize">{item.type ? item.type.replace(/_/g, ' ') : 'Flag'}:</span>
                  <span className="font-bold text-[#2F6BFF]">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/15 text-[#b9c9e2] hover:bg-white/5 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmSubmit}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#2F6BFF] to-[#1D4ED8] hover:from-[#2557D6] hover:to-[#1E40AF] text-white font-semibold text-sm shadow-lg shadow-[#2F6BFF]/25 transition-all"
          >
            Submit Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
