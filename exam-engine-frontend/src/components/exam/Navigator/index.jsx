import React from 'react';
import { useExam } from '../../../context/ExamContext';

export default function Navigator() {
  const { questions, currentIdx, setCurrentIdx, answers, visitedQuestions, markedQuestions } = useExam();

  return (
    <div>
      <div className="aside-h text-[11px] text-[#8A99AE] font-semibold uppercase font-mono mb-2">
        Question navigator
      </div>
      <div className="qnav grid grid-cols-6 gap-1.5">
        {questions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined;
          const isVisited = visitedQuestions.has(q.id);
          const isMarked = markedQuestions.has(q.id);
          const isActive = i === currentIdx;

          let btnClass = 'bg-white/5 text-[#9fb6d6] border-white/10'; // Not Visited (Gray)
          if (isAnswered && isMarked) {
            btnClass = 'bg-[#f97316]/20 text-[#fdba74] border-[#f97316]/40'; // Answered + Marked (Orange)
          } else if (isMarked) {
            btnClass = 'bg-[#8b5cf6]/20 text-[#a78bfa] border-[#8b5cf6]/40'; // Marked for Review (Purple)
          } else if (isAnswered) {
            btnClass = 'bg-[#10b981]/20 text-[#34d27b] border-[#10b981]/40'; // Answered (Green)
          } else if (isVisited) {
            btnClass = 'bg-[#2f6bff]/20 text-[#7fa6ff] border-[#2f6bff]/40'; // Visited (Blue)
          }

          if (isActive) {
            btnClass = 'bg-[#2F6BFF] text-white border-white shadow-[0_0_8px_rgba(47,107,255,0.8)] font-bold';
          }

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(i)}
              className={`aspect-square rounded-lg font-mono text-xs flex items-center justify-center border transition-all ${btnClass}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
