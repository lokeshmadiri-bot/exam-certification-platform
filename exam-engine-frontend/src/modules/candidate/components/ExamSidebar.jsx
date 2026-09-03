import React from 'react';
import { useExam } from '../context/ExamContext';
import Timer from './ExamTimer';

export default function Sidebar({ durationSeconds }) {
  const { 
    videoRef, 
    setShowConfirmSubmit,
    questions,
    beginnerTimeRemaining,
    intermediateTimeRemaining,
    advancedTimeRemaining,
    currentIdx
  } = useExam();

  const beginnerCount = questions.filter(q => {
    const d = q.difficulty ? q.difficulty.trim().toUpperCase() : 'EASY';
    return d !== 'MEDIUM' && d !== 'HARD';
  }).length;

  const intermediateCount = questions.filter(q => q.difficulty?.trim().toUpperCase() === 'MEDIUM').length;
  const advancedCount = questions.filter(q => q.difficulty?.trim().toUpperCase() === 'HARD').length;

  const currentQuestion = questions[currentIdx];
  const qDiff = currentQuestion?.difficulty ? currentQuestion.difficulty.trim().toUpperCase() : 'EASY';
  const activeSection = qDiff === 'HARD' ? 'HARD' : (qDiff === 'MEDIUM' ? 'MEDIUM' : 'EASY');

  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return "--:--:--";
    if (secs < 0) secs = 0;
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const totalTimeRemaining = (beginnerTimeRemaining || 0) + (intermediateTimeRemaining || 0) + (advancedTimeRemaining || 0);

  const activeSectionLabel = activeSection === 'HARD' ? 'Advanced' : (activeSection === 'MEDIUM' ? 'Intermediate' : 'Beginner');
  const activeTimeRemaining = activeSection === 'HARD'
    ? advancedTimeRemaining
    : (activeSection === 'MEDIUM' ? intermediateTimeRemaining : beginnerTimeRemaining);

  return (
    <aside className="run-aside flex flex-col gap-5 h-full">
      {/* Scrollable upper content */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-2">
        {/* Camera PIP View - Larger & prominent feed */}
        <div className="cam-pip rounded-2xl w-full h-[200px] bg-gradient-to-t from-[#0b2038] to-[#1c3c66] flex items-center justify-center border border-white/15 relative overflow-hidden shadow-xl shrink-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100 min-h-[200px]"
          />
          <div className="rec absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/70 text-white font-mono text-[10px] px-2.5 py-1 rounded-full border border-white/10 shadow-sm backdrop-blur-sm z-10 overflow-hidden">
            <i className="w-2 h-2 rounded-full bg-[#E04F4F] animate-pulse shrink-0" />
            <span className="font-semibold tracking-wider">REC</span>
          </div>

          {/* Section Timer displayed only at top right of camera recording area */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/80 text-white font-mono text-xs px-3 py-1 rounded-full border border-white/15 shadow-md backdrop-blur-sm z-10">
            <span className="text-[10.5px] text-sky-400 font-bold uppercase tracking-wider">{activeSectionLabel}:</span>
            <span className={`font-bold ${activeTimeRemaining <= 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {formatTime(activeTimeRemaining)}
            </span>
          </div>
        </div>

        {/* Compact Status Legend Card */}
        <div 
          style={{
            padding: '16px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            userSelect: 'none'
          }}
        >
          <div 
            style={{
              fontSize: '11px',
              color: '#8A99AE',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: 'monospace',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '8px',
              marginBottom: '2px'
            }}
          >
            Question Status
          </div>
          {[
            { className: 'status-current', label: 'Current Question' },
            { className: 'status-answered', label: 'Answered' },
            { className: 'status-visited', label: 'Unanswered' },
            { className: 'status-unvisited', label: 'Not Visited' },
            { className: 'status-marked', label: 'Marked for Review' },
            { className: 'status-answered-marked', label: 'Answered & Marked' },
          ].map(({ className, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={`w-3.5 h-3.5 rounded-sm shrink-0 border ${className}`} style={{ display: 'inline-block' }} />
              <span style={{ fontSize: '11.5px', color: '#cbd5e1', fontWeight: '600', fontFamily: 'sans-serif' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Row - Pinned to bottom of the sidebar container */}
      <div className="shrink-0 pt-4 border-t border-white/10 flex flex-col">
        <button
          onClick={() => setShowConfirmSubmit(true)}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-extrabold text-[15px] shadow-[0_4px_18px_rgba(234,179,8,0.45)] transition-all duration-200 active:scale-[0.98] border border-yellow-300/50 tracking-wide cursor-pointer flex items-center justify-center gap-2"
        >
          Submit All
        </button>
      </div>
    </aside>
  );
}

