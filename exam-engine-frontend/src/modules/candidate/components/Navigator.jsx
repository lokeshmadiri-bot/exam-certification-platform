import React from 'react';
import { useExam } from '../context/ExamContext';

export default function Navigator() {
  const { questions, currentIdx, setCurrentIdx, answers, visitedQuestions, markedQuestions } = useExam();

  return (
    <div>
      <div className="aside-h text-[11px] text-[#8A99AE] font-semibold uppercase font-mono mb-2">
        Question navigator
      </div>
      <div className="qnav grid grid-cols-6 gap-1.5" style={{ marginBottom: '28px' }}>
        {questions.map((q, i) => {
          const isAnswered   = answers[q.id] !== undefined;
          const isVisited    = visitedQuestions.has(q.id);
          const isMarked     = markedQuestions.has(q.id);
          const isActive     = i === currentIdx;

          // Priority order: active > answered+marked > marked > answered > visited (unanswered) > not visited
          let btnClass;

          if (isActive) {
            btnClass = 'status-current';
          } else if (isAnswered && isMarked) {
            btnClass = 'status-answered-marked';
          } else if (isMarked) {
            btnClass = 'status-marked';
          } else if (isAnswered) {
            btnClass = 'status-answered';
          } else if (isVisited) {
            btnClass = 'status-visited';
          } else {
            btnClass = 'status-unvisited';
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

      {/* Legend */}
      <div className="flex flex-col gap-2.5" style={{ marginTop: '28px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {[
          { className: 'status-current', label: 'Current' },
          { className: 'status-answered', label: 'Answered' },
          { className: 'status-answered-marked', label: 'Answered + Marked' },
          { className: 'status-marked', label: 'Marked for Review' },
          { className: 'status-visited', label: 'Unanswered (Visited)' },
          { className: 'status-unvisited', label: 'Not Visited' },
        ].map(({ className, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-sm shrink-0 border ${className}`} style={{ display: 'inline-block' }} />
            <span className="text-[10px] text-[#8A99AE] font-semibold font-mono">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
