import React from 'react';
import { useExam } from '../context/ExamContext';

export default function Footer() {
  const { questions, currentIdx, setCurrentIdx } = useExam();

  if (!questions || questions.length === 0) return null;

  const currentQuestion = questions[currentIdx];
  const qDiff = currentQuestion?.difficulty ? currentQuestion.difficulty.trim().toUpperCase() : 'EASY';
  const activeSection = qDiff === 'HARD' ? 'HARD' : (qDiff === 'MEDIUM' ? 'MEDIUM' : 'EASY');

  // Filter question indices that belong strictly to the active section
  const sectionQuestionIndices = [];
  questions.forEach((q, idx) => {
    const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
    const sec = d === 'HARD' ? 'HARD' : (d === 'MEDIUM' ? 'MEDIUM' : 'EASY');
    if (sec === activeSection) {
      sectionQuestionIndices.push(idx);
    }
  });

  const posInSection = sectionQuestionIndices.indexOf(currentIdx);
  const isFirstInSection = posInSection <= 0;
  const isLastInSection = posInSection < 0 || posInSection >= sectionQuestionIndices.length - 1;

  const handlePrevious = () => {
    if (!isFirstInSection) {
      const prevIdx = sectionQuestionIndices[posInSection - 1];
      setCurrentIdx(prevIdx);
    }
  };

  const handleNext = () => {
    if (!isLastInSection) {
      const nextIdx = sectionQuestionIndices[posInSection + 1];
      setCurrentIdx(nextIdx);
    }
  };

  return (
    <div className="run-foot flex items-center justify-between gap-4 max-w-[760px] mt-[28px] mx-auto w-full px-2 sm:px-4">
      <button
        type="button"
        disabled={isFirstInSection}
        onClick={handlePrevious}
        className="px-6 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[13.5px] transition-all cursor-pointer shadow-sm flex items-center gap-2"
      >
        &larr; Previous
      </button>

      <button
        type="button"
        disabled={isLastInSection}
        onClick={handleNext}
        className="px-6 py-2.5 rounded-full border border-[#f7b64a] bg-[#F5A623] hover:bg-[#e09518] text-[#2C1A00] disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-[13.5px] transition-all cursor-pointer shadow-[0_4px_14px_rgba(245,166,35,0.4)] flex items-center gap-2"
      >
        Next question &rarr;
      </button>
    </div>
  );
}
