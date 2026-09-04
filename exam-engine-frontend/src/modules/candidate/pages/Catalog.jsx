import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Award, Play, Clock, BookOpen, Shield } from 'lucide-react';
import { examService, candidateService } from '../services/api';

export default function CandidateCatalog() {
  const navigate = useNavigate();
  const { searchQuery } = useOutletContext();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [examsRes, attemptsRes] = await Promise.all([
          examService.getAllExams(),
          candidateService.getMyAttempts()
        ]);
        setExams(examsRes.data || []);
        setAttempts(attemptsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getStackIcon = (stack) => {
    const STACK_ICONS = { java: "☕", react: "⚛", python: "🐍", node: "⬡", sql: "🗄" };
    const STACK_BG = { java: "#fdf6e7", react: "#eaf2fb", python: "#e9f5ee", node: "#f0f6ee", sql: "#f0ecfb" };
    const key = stack ? stack.toLowerCase() : '';
    return {
      icon: STACK_ICONS[key] || "📝",
      bg: STACK_BG[key] || "#eef3f9",
      fg: "#0E1B2E"
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-[#5c6b82] font-semibold">
        <div className="w-8 h-8 border-4 border-[#e4eaf2] border-t-[#2F6BFF] rounded-full animate-spin"></div>
        <span className="font-mono text-xs">Loading exam catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-head">
        <h1 className="font-display font-extrabold text-3xl text-[#0E1B2E] tracking-tight mt-3 mb-1">Exam Catalogue</h1>
        <p className="text-[#5C6B82] text-sm font-medium">
          Browse certifications across all tech stacks. Active candidates can attempt each exam once per 30-day window.
        </p>
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {exams.filter(e => {
          if (!e) return false;
          const st = e.status ? String(e.status).toUpperCase() : 'ACTIVE';
          const isStatusMatch = !e.status || st === 'ACTIVE' || st === 'DRAFT' || st === 'PUBLISHED' || st === 'INACTIVE';
          const isSearchMatch = !searchQuery ||
            (e.title && e.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (e.stack && e.stack.toLowerCase().includes(searchQuery.toLowerCase()));
          return isStatusMatch && isSearchMatch;
        }).map((exam) => {
          const currentExamId = exam.examId || exam.id;
          const styleIcon = getStackIcon(exam.stack);

          const isSameExam = (a, e) => {
            if (!a || !e) return false;
            const aId = String(a.examId || a.id || a.exam?.id || '').toLowerCase().trim();
            const eId = String(e.examId || e.id || '').toLowerCase().trim();
            if (aId && eId && aId === eId) return true;

            const aTitle = String(a.examTitle || a.title || '').toLowerCase().trim();
            const eTitle = String(e.title || '').toLowerCase().trim();
            if (aTitle && eTitle) {
              if (aTitle === eTitle || aTitle.includes(eTitle) || eTitle.includes(aTitle)) return true;
              if ((aTitle.includes('react') || aTitle.includes('frontend')) && (eTitle.includes('react') || eTitle.includes('frontend'))) return true;
              if ((aTitle.includes('java') || aTitle.includes('full stack') || aTitle.includes('fullstack')) && (eTitle.includes('java') || eTitle.includes('full stack') || eTitle.includes('fullstack'))) return true;
              if ((aTitle.includes('python') || aTitle.includes('backend')) && (eTitle.includes('python') || eTitle.includes('backend'))) return true;
            }

            const aStack = String(a.stack || '').toLowerCase().trim();
            const eStack = String(e.stack || '').toLowerCase().trim();
            if (aStack && eStack) {
              if (aStack === eStack || aStack.includes(eStack) || eStack.includes(aStack)) return true;
              if ((aStack.includes('react') || aStack.includes('frontend')) && (eStack.includes('react') || eStack.includes('frontend'))) return true;
              if ((aStack.includes('java') || aStack.includes('fullstack') || aStack.includes('full stack')) && (eStack.includes('java') || eStack.includes('fullstack') || eStack.includes('full stack'))) return true;
              if ((aStack.includes('python') || aStack.includes('backend')) && (eStack.includes('python') || eStack.includes('backend'))) return true;
            }

            return false;
          };

          const matchingAttempts = attempts.filter(a => isSameExam(a, exam));
          let canAttempt = true;
          let daysLeft = 0;

          const lockedAttempt = matchingAttempts.find(a => a && (a.canAttempt === false || (a.canAttempt === undefined && ['PASSED', 'FAILED', 'SUBMITTED', 'TERMINATED'].includes(String(a.resultStatus || '').toUpperCase()))));

          if (lockedAttempt) {
            canAttempt = false;
            daysLeft = lockedAttempt.retryDaysLeft || 30;
          } else if (matchingAttempts.length > 0) {
            const first = matchingAttempts[0];
            if (first.canAttempt !== undefined && first.canAttempt !== null) {
              canAttempt = Boolean(first.canAttempt);
            } else {
              const isFinished = ['PASSED', 'FAILED', 'SUBMITTED', 'TERMINATED'].includes(String(first.resultStatus || '').toUpperCase());
              canAttempt = !isFinished;
            }
            daysLeft = first.retryDaysLeft || 0;
          }

          return (
            <div
              key={currentExamId}
              className="group relative bg-white border border-[#E4EAF2] hover:border-[#2F6BFF]/40 rounded-2xl p-6 shadow-sm hover:shadow-[0_12px_28px_rgba(47,107,255,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                backgroundColor: '#ffffff',
                border: '1px solid #E4EAF2',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div className="top flex items-start justify-between gap-4 mb-4" style={{ display: 'flex', alignItems: 'start', gap: '16px', marginBottom: '16px' }}>
                <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="ic w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105" style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: styleIcon.bg, color: styleIcon.fg, fontSize: '22px' }}>
                    {styleIcon.icon}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-[16px] text-[#0E1B2E] tracking-tight line-clamp-1" style={{ fontSize: '16px', fontWeight: '700', color: '#0E1B2E', margin: '0' }}>{exam.title}</h3>
                    <div className="sub text-[11.5px] text-[#6b7c96] font-bold uppercase tracking-wider mt-0.5" style={{ fontSize: '11.5px', color: '#6b7c96', fontWeight: '700' }}>{exam.stack} Certification</div>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-[#EEF2F8] my-3" style={{ height: '1px', backgroundColor: '#EEF2F8', margin: '12px 0' }}></div>

              <div className="facts flex gap-6 my-3 text-[12.5px] text-[#5C6B82] font-semibold" style={{ display: 'flex', gap: '24px', margin: '12px 0', fontSize: '12.5px', color: '#5C6B82' }}>
                <div className="flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock className="w-4 h-4 text-[#5C6B82]/70" />
                  <span>Duration: <b className="text-[#0E1B2E] font-semibold" style={{ color: '#0E1B2E' }}>{exam.durationMinutes}m</b></span>
                </div>
                <div className="flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen className="w-4 h-4 text-[#5C6B82]/70" />
                  <span>Questions: <b className="text-[#0E1B2E] font-semibold" style={{ color: '#0E1B2E' }}>{exam.perAttempt}</b></span>
                </div>
              </div>

              <div className="foot mt-6 pt-3 border-t border-[#EEF2F8] flex items-center justify-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #EEF2F8' }}>
                {!canAttempt ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-[#fff3df] text-[#c9831a] px-2.5 py-1 rounded-lg border border-[#f5e2b3]" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: '1px solid #f5e2b3', backgroundColor: '#fff3df', color: '#c9831a' }}>
                      <Clock className="w-3.5 h-3.5" />
                      Locked · {daysLeft}d left
                    </span>
                    <button className="btn cursor-not-allowed opacity-50 bg-[#eef2f8] text-[#8fa3c4] border border-[#d2dfef] shadow-none hover:transform-none px-4 py-2.5 text-[12.5px] font-bold rounded-xl" style={{ padding: '8px 16px', borderRadius: '12px' }} disabled>
                      Locked
                    </button>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-[#e7f7f0] text-[#0a7a52] px-2.5 py-1 rounded-lg border border-[#c3ebd7]" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: '1px solid #c3ebd7', backgroundColor: '#e7f7f0', color: '#0a7a52' }}>
                      <Shield className="w-3.5 h-3.5 text-[#0a7a52]" />
                      Ready
                    </span>
                    <button
                      onClick={() => navigate(`/candidate/instructions/${currentExamId}`)}
                      className="inline-flex items-center gap-1.5 bg-[#2F6BFF] hover:bg-[#1a56e8] text-white px-4.5 py-2.5 text-[12.5px] font-bold rounded-xl shadow-[0_4px_12px_rgba(47,107,255,0.15)] hover:shadow-[0_6px_20px_rgba(47,107,255,0.25)] transition-all duration-200"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#2F6BFF', color: '#ffffff', padding: '10px 18px', borderRadius: '12px', fontWeight: '700' }}
                    >
                      <span>Start Exam</span>
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
