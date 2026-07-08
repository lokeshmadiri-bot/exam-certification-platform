import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useExam } from '../../../context/ExamContext';

export default function ViolationSummary({ isOpen, violations, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1f38]/60 backdrop-blur-[3px] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl max-w-[480px] w-full p-[26px] shadow-2xl text-[#0E1B2E]">
        <div className="flex items-center gap-2 text-[#E04F4F] mb-3">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-display text-[19px] font-semibold">Integrity Warning Summary</h3>
        </div>
        <p className="text-[13.5px] text-[#5C6B82] mb-4 leading-relaxed">
          The proctoring system flagged potential integrity violations during this exam session.
        </p>
        <div className="max-h-[160px] overflow-y-auto border border-gray-100 rounded-lg p-3 bg-gray-50/50 mb-5 text-xs text-gray-600 flex flex-col gap-2">
          {violations && violations.length > 0 ? (
            violations.map((v, idx) => (
              <div key={idx} className="flex justify-between border-b border-gray-100 pb-1.5 last:border-0 last:pb-0">
                <span>{v.code} - {v.meta}</span>
                <span className="font-mono text-gray-400">{v.offset}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-2 text-gray-400">No violations flagged.</div>
          )}
        </div>
        <div className="flex gap-2.5 justify-end">
          <button
            className="px-[18px] py-[11px] rounded-xl border border-[#E4EAF2] hover:bg-[#F4F7FC] hover:border-[#cdd8e8] font-semibold text-[13.5px] transition-all"
            onClick={onCancel}
          >
            Review answers
          </button>
          <button
            className="px-[18px] py-[11px] rounded-xl bg-[#E04F4F] hover:bg-[#c93e3e] text-white font-semibold text-[13.5px] transition-all"
            onClick={onConfirm}
          >
            Submit anyway
          </button>
        </div>
      </div>
    </div>
  );
}
