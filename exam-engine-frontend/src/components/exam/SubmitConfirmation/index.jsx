import React from 'react';
import { useExam } from '../../../context/ExamContext';

export default function SubmitConfirmation({ onConfirm }) {
  const { showConfirmSubmit, setShowConfirmSubmit } = useExam();

  if (!showConfirmSubmit) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1f38]/60 backdrop-blur-[3px] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl max-w-[460px] w-full p-[26px] shadow-2xl text-[#0E1B2E]">
        <h3 className="font-display text-[19px] font-semibold mb-2">Before you submit</h3>
        <p className="text-[13.5px] text-[#5C6B82] mb-5 leading-relaxed">
          Are you sure you want to finalize and submit your exam? You won't be able to re-enter this attempt session.
        </p>
        <div className="flex gap-2.5 justify-end">
          <button
            className="px-[18px] py-[11px] rounded-xl border border-[#E4EAF2] hover:bg-[#F4F7FC] hover:border-[#cdd8e8] font-semibold text-[13.5px] transition-all"
            onClick={() => setShowConfirmSubmit(false)}
          >
            Keep working
          </button>
          <button
            className="px-[18px] py-[11px] rounded-xl bg-[#2F6BFF] hover:bg-[#2256d6] text-white font-semibold text-[13.5px] shadow-[0_6px_16px_rgba(47,107,255,0.2)] transition-all"
            onClick={onConfirm}
          >
            Submit anyway
          </button>
        </div>
      </div>
    </div>
  );
}
