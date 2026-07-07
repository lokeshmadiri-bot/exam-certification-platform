import React from 'react';
import { useExam } from '../../../context/ExamContext';

export default function Navigator() {
  const { questions, currentIdx, setCurrentIdx, selectedAnswers } = useExam();

  return (
    <div>
      <div className="aside-h text-[11px] text-[#8A99AE] font-semibold uppercase font-mono mb-2">
        Question navigator
      </div>
      <div className="qnav grid grid-cols-6 gap-1.5">
        {questions.map((q, i) => {
          const isSelected = selectedAnswers[q.id] !== undefined;
          const isActive = i === currentIdx;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(i)}
              className={`aspect-square rounded-lg font-mono text-xs flex items-center justify-center border transition-all ${
                isActive
                  ? 'bg-[#2F6BFF] text-white border-[#2F6BFF]'
                  : isSelected
                  ? 'bg-[#2f6bff]/20 text-[#cdddf6] border-[#2f6bff]/40'
                  : 'bg-white/5 text-[#9fb6d6] border-white/10'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
