import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, Monitor, RefreshCw, ChevronRight, Lock } from 'lucide-react';
import { examService, candidateService } from '../services/api';

export default function CandidateInstructions() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [examRes, attemptsRes] = await Promise.all([
          examService.getExamById(examId).catch(() => null),
          candidateService.getMyAttempts().catch(() => null)
        ]);

        const examData = examRes?.data || examRes || null;
        setExam(examData);

        const rawAttempts = attemptsRes?.data !== undefined ? attemptsRes.data : (attemptsRes?.rows !== undefined ? attemptsRes.rows : (attemptsRes || []));
        const attemptsList = Array.isArray(rawAttempts) ? rawAttempts : [];

        if (examData && attemptsList.length > 0) {
          const isSameExam = (a, e) => {
            if (!a || !e) return false;
            const aId = String(a.examId || a.id || a.exam?.id || '').toLowerCase().trim();
            const eId = String(e.examId || e.id || examId || '').toLowerCase().trim();
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

          const matchingAttempts = attemptsList.filter(a => isSameExam(a, examData));
          const lockedAttempt = matchingAttempts.find(a => a && (a.canAttempt === false || (a.canAttempt === undefined && ['PASSED', 'FAILED', 'SUBMITTED', 'TERMINATED'].includes(String(a.resultStatus || '').toUpperCase()))));

          if (lockedAttempt) {
            setIsLocked(true);
            setDaysLeft(lockedAttempt.retryDaysLeft || 30);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, [examId]);

  const I18N = {
    en: {
      title: "Exam instructions",
      lede: "Please read the rules carefully. You must agree before you can proceed to the camera check.",
      r1t: "Stay on the exam tab",
      r1: "Switching tabs, minimising or resizing the window each count as a strike. After 3 strikes the exam ends automatically.",
      r2t: "Camera & lighting",
      r2: "Sit facing a light source and avoid backlight. Keep your face fully in frame for the whole exam.",
      r4t: "Refresh, back or closing = ended",
      r4: "Refreshing the page, pressing back or closing the tab submits your answers and ends the attempt. You cannot re-enter.",
      fmt: "Format at a glance",
      q: "Questions",
      dur: "Duration",
      autos: "Your answers are saved automatically while you progress through the exam. You may review and modify your answers before submitting the exam.",
      agt: "I have read and agree to the terms & conditions",
      ag: "Including online proctoring, webcam recording, exam integrity monitoring and automatic termination conditions.",
      proceed: "Proceed to system check"
    }
  };

  const t = I18N.en;

  if (!exam) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#2F6BFF] border-t-transparent"></div>
        <span className="ml-3 text-[#5C6B82] text-sm">
          Loading exam instructions...
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <div className="page-head mb-0">
          <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Step 1 of 3</span>
          <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1">
            {exam.title}
          </h1>
          <p className="text-[#5C6B82] text-sm mt-1">
            {exam.stack} Certification
          </p>
        </div>
      </div>

      {/* Spaced Split Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Rules list (7 spans on lg) */}
        <div className="card pad lg:col-span-7 bg-white" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #E4EAF2', boxShadow: '0 1px 3px rgba(11,31,56,.06)' }}>
          <div className="pb-4 border-b border-[#EEF2F8] mb-5">
            <h2 className="font-display font-bold text-[18px] text-[#0E1B2E]">{t.title}</h2>
            <p className="text-xs text-[#5C6B82] mt-1.5 leading-relaxed">{t.lede}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="instr flex gap-4">
              <div className="ic shrink-0 w-[40px] h-[40px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-bold text-[#0E1B2E]">{t.r1t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-1">{t.r1}</p>
              </div>
            </div>

            <div className="instr flex gap-4">
              <div className="ic shrink-0 w-[40px] h-[40px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-bold text-[#0E1B2E]">{t.r2t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-1">{t.r2}</p>
              </div>
            </div>

            <div className="instr flex gap-4">
              <div className="ic shrink-0 w-[40px] h-[40px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-bold text-[#0E1B2E]">{t.r4t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-1">{t.r4}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Format & Consent Cards stacked (5 spans on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Format Card */}
          <div className="card pad" style={{ backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(11,31,56,.06)' }}>
            <h3 className="font-display font-bold text-[15px] text-[#0E1B2E] mb-4 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '6px', height: '14px', backgroundColor: '#2F6BFF', borderRadius: '3px' }}></span>
              {t.fmt}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid #EEF2F8', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#F4F7FC', borderRadius: '10px' }}>
                <span style={{ color: '#5C6B82', fontSize: '13px', fontWeight: '500' }}>{t.q}</span>
                <span style={{ fontFamily: 'monospace', color: '#0E1B2E', fontWeight: '700', fontSize: '13px' }}>{exam.perAttempt} MCQs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#F4F7FC', borderRadius: '10px' }}>
                <span style={{ color: '#5C6B82', fontSize: '13px', fontWeight: '500' }}>{t.dur}</span>
                <span style={{ fontFamily: 'monospace', color: '#0E1B2E', fontWeight: '700', fontSize: '13px' }}>{exam.durationMinutes} mins</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#F4F7FC', borderRadius: '10px' }}>
                <span style={{ color: '#5C6B82', fontSize: '13px', fontWeight: '500' }}>Passing Score</span>
                <span style={{ fontFamily: 'monospace', color: '#0E9F6E', fontWeight: '700', fontSize: '13px', backgroundColor: '#e7f7f0', padding: '2px 8px', borderRadius: '6px', border: '1px solid #c3ebd7' }}>{exam.passMark}%</span>
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '12px 14px', backgroundColor: 'rgba(47,107,255,0.06)', border: '1px solid rgba(47,107,255,0.12)', borderRadius: '10px', fontSize: '12.5px', color: '#2F6BFF', fontWeight: '500', lineHeight: '1.5', textAlign: 'left' }}>
              {t.autos}
            </div>
          </div>

          {/* Consent and Action Card */}
          <div className="card pad" style={{ backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(11,31,56,.06)' }}>
            <div 
              style={{
                display: 'flex',
                alignItems: 'start',
                gap: '12px',
                padding: '14px',
                border: agreed ? '1.5px solid #2F6BFF' : '1px solid #E4EAF2',
                backgroundColor: agreed ? 'rgba(47,107,255,0.03)' : '#ffffff',
                borderRadius: '12px',
                transition: 'all 0.15s ease',
                marginBottom: '16px'
              }}
            >
              <div style={{ flex: 1, textAlign: 'left' }}>
                <b style={{ display: 'block', color: '#0E1B2E', fontSize: '13.5px', fontWeight: '700' }}>{t.agt}</b>
                <p style={{ fontSize: '11px', color: '#5C6B82', lineHeight: '1.4', marginTop: '4px' }}>{t.ag}</p>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setAgreed(!agreed);
                }}
                className={`toggle shrink-0 ${agreed ? '' : 'off'}`}
                style={{ marginTop: '2px', flexShrink: 0, cursor: 'pointer' }}
              >
                <i />
              </div>
            </div>

            {isLocked ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '14px', backgroundColor: '#fff3df', border: '1px solid #f5e2b3', borderRadius: '12px', color: '#c9831a', fontSize: '12.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Lock className="w-5 h-5 shrink-0 text-[#c9831a]" />
                  <span>Exam locked. Candidates must wait 30 days between retakes unless an admin approves an override ({daysLeft} day(s) remaining).</span>
                </div>
                <button
                  disabled
                  className="btn bg-[#eef2f8] text-[#8fa3c4] border border-[#d2dfef] flex items-center justify-center gap-1.5 w-full font-bold text-[13.5px] py-3 rounded-xl cursor-not-allowed opacity-60"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    backgroundColor: '#eef2f8',
                    color: '#8fa3c4',
                    fontWeight: '700',
                    fontSize: '13.5px',
                    padding: '12.5px',
                    borderRadius: '10px',
                    cursor: 'not-allowed',
                    border: '1px solid #d2dfef'
                  }}
                >
                  <Lock className="w-4 h-4 text-[#8fa3c4]" />
                  <span>Locked · {daysLeft}d left</span>
                </button>
              </div>
            ) : (
              <button
                disabled={!agreed}
                onClick={() => navigate(`/candidate/check/${examId}`)}
                className="btn bg-[#2F6BFF] hover:bg-[#2256d6] disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-1.5 w-full font-semibold text-[13.5px] py-3 rounded-xl shadow-md transition-all"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  backgroundColor: agreed ? '#2F6BFF' : '#a0aec0',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '13.5px',
                  padding: '12.5px',
                  borderRadius: '10px',
                  cursor: agreed ? 'pointer' : 'not-allowed',
                  boxShadow: agreed ? '0 4px 6px rgba(47,107,255,0.2)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <span>{t.proceed}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
