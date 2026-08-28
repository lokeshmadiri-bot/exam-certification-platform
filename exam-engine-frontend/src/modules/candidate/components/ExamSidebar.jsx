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

  return (
    <aside className="run-aside flex flex-col gap-5 h-full">
      {/* Scrollable upper content */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-2">
        {/* Timer Display */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
            userSelect: 'none'
          }}
        >
          <Timer />
        </div>

        {/* Section Timers Panel */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          userSelect: 'none'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#8A99AE',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontFamily: 'monospace',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '8px',
            marginBottom: '2px'
          }}>
            Section Timers
          </div>
          
          {beginnerCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12.5px', color: activeSection === 'EASY' ? '#2F6BFF' : '#cbd5e1', fontWeight: '700' }}>
                  Beginner {activeSection === 'EASY' && '⏱️'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#8a99ae' }}>
                  {beginnerCount} questions
                </div>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: beginnerTimeRemaining === 0 ? '#ef4444' : '#ffffff' }}>
                {formatTime(beginnerTimeRemaining)}
              </div>
            </div>
          )}

          {intermediateCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12.5px', color: activeSection === 'MEDIUM' ? '#10b981' : '#cbd5e1', fontWeight: '700' }}>
                  Intermediate {activeSection === 'MEDIUM' && '⏱️'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#8a99ae' }}>
                  {intermediateCount} questions
                </div>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: intermediateTimeRemaining === 0 ? '#ef4444' : '#ffffff' }}>
                {formatTime(intermediateTimeRemaining)}
              </div>
            </div>
          )}

          {advancedCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12.5px', color: activeSection === 'HARD' ? '#f59e0b' : '#cbd5e1', fontWeight: '700' }}>
                  Advanced {activeSection === 'HARD' && '⏱️'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#8a99ae' }}>
                  {advancedCount} questions
                </div>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: advancedTimeRemaining === 0 ? '#ef4444' : '#ffffff' }}>
                {formatTime(advancedTimeRemaining)}
              </div>
            </div>
          )}
          
          <div style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontWeight: '700',
            color: '#8A99AE'
          }}>
            <span>Total Exam Time</span>
            <span style={{ fontFamily: 'monospace' }}>{formatTime(totalTimeRemaining)}</span>
          </div>
        </div>

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
          className="w-full py-3.5 px-6 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-white font-bold text-[14.5px] shadow-[0_4px_14px_rgba(56,189,248,0.25)] transition-all duration-200 active:scale-[0.98] border border-white/10 tracking-wide cursor-pointer flex items-center justify-center gap-2"
        >
          Submit Exam
        </button>
      </div>
    </aside>
  );
}

