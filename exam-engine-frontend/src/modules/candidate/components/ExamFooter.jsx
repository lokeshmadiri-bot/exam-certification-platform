import React from 'react';
import { useExam } from '../context/ExamContext';

export default function Footer() {
  const { questions, currentIdx, setCurrentIdx, setShowConfirmSubmit } = useExam();

  if (questions.length === 0) return null;

  const isLastQuestion = currentIdx === questions.length - 1;

  return (
    <div className="run-foot flex items-center justify-between gap-4 max-w-[760px] mt-[28px] mx-auto w-full px-2 sm:px-4">
      <button
        disabled={currentIdx === 0}
        onClick={() => setCurrentIdx(currentIdx - 1)}
        className="px-5 py-2.5 rounded-xl border border-white/10 text-[#cdddf6] hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[13.5px] transition-all"
      >
        &larr; Previous
      </button>
      
      {isLastQuestion ? (
        <button
          onClick={() => setShowConfirmSubmit(true)}
          className="px-5 py-2.5 rounded-xl bg-[#F2A93B] hover:bg-[#e69f2c] text-[#3a2700] font-semibold text-[13.5px] shadow-sm transition-all"
        >
          Review &amp; Submit &rarr;
        </button>
      ) : (
        <button
          onClick={() => setCurrentIdx(currentIdx + 1)}
          className="px-5 py-2.5 rounded-xl bg-[#2F6BFF] hover:bg-[#2256d6] text-white font-semibold text-[13.5px] shadow-sm transition-all"
        >
          Next question &rarr;
        </button>
      )}
    </div>
  );
}
