import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Play, Clock, BookOpen, Shield } from 'lucide-react';
import { examService, candidateService } from '../services/api';

export default function CandidateCatalog() {
  const navigate = useNavigate();
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
    const configs = {
      selenium: { bg: '#eaf1ff', fg: '#2F6BFF' },
      api: { bg: '#e7f7f0', fg: '#0E9F6E' },
      java: { bg: '#fdf3da', fg: '#b58600' },
      react: { bg: '#e0f7fa', fg: '#00838f' },
      python: { bg: '#eceff1', fg: '#37474f' },
      node: { bg: '#efebe9', fg: '#4e342e' },
      sql: { bg: '#fbe9e7', fg: '#d84315' },
      devops: { bg: '#f0ecff', fg: '#6b54d4' }
    };
    return configs[stack ? stack.toLowerCase() : ''] || { bg: '#eef2f8', fg: '#5C6B82' };
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="page-head">
        <span className="eyebrow font-mono text-[10px] tracking-[2px] uppercase text-[#2F6BFF] bg-[#2F6BFF]/10 px-3 py-1 rounded-full border border-[#2F6BFF]/20 font-bold">
          Catalogue
        </span>
        <h1 className="font-display font-extrabold text-3xl text-[#0E1B2E] tracking-tight mt-3 mb-1">Exam Catalogue</h1>
        <p className="text-[#5C6B82] text-sm font-medium">
          Browse certifications across all tech stacks. Active candidates can attempt each exam once per 30-day window.
        </p>
      </div>

      <div className="exam-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.filter(e => !e.status || e.status === 'ACTIVE' || e.status === 'DRAFT').map((exam) => {
          const style = getStackIcon(exam.stack);
          const lastAttempt = attempts.find(a => a.examId === exam.examId);
          const canAttempt = lastAttempt?.canAttempt ?? true;
          const daysLeft = lastAttempt?.retryDaysLeft ?? 0;

          return (
            <div key={exam.examId} className="group relative bg-white border border-[#E4EAF2] hover:border-[#2F6BFF]/40 rounded-2xl p-6 shadow-sm hover:shadow-[0_12px_28px_rgba(47,107,255,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="top flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="ic w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105" style={{ backgroundColor: style.bg, color: style.fg }}>
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-[16px] text-[#0E1B2E] tracking-tight line-clamp-1">{exam.title}</h3>
                    <div className="sub text-[11.5px] text-[#6b7c96] font-bold uppercase tracking-wider mt-0.5">{exam.stack} Certification</div>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-[#EEF2F8] my-3"></div>

              <div className="facts flex gap-6 my-3 text-[12.5px] text-[#5C6B82] font-semibold">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#5C6B82]/70" />
                  <span>Duration: <b className="text-[#0E1B2E] font-semibold">{exam.durationMinutes}m</b></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#5C6B82]/70" />
                  <span>Questions: <b className="text-[#0E1B2E] font-semibold">{exam.perAttempt}</b></span>
                </div>
              </div>

              <div className="foot mt-6 pt-3 border-t border-[#EEF2F8] flex items-center justify-between">
                {!canAttempt ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-[#fff3df] text-[#c9831a] px-2.5 py-1 rounded-lg border border-[#f5e2b3]">
                      <Clock className="w-3.5 h-3.5" />
                      Locked · {daysLeft}d left
                    </span>
                    <button className="btn cursor-not-allowed opacity-50 bg-[#eef2f8] text-[#8fa3c4] border border-[#d2dfef] shadow-none hover:transform-none px-4 py-2.5 text-[12.5px] font-bold rounded-xl" disabled>
                      Locked
                    </button>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-[#e7f7f0] text-[#0a7a52] px-2.5 py-1 rounded-lg border border-[#c3ebd7]">
                      <Shield className="w-3.5 h-3.5 text-[#0a7a52]" />
                      Ready
                    </span>
                    <button
                      onClick={() => navigate(`/candidate/instructions/${exam.examId}`)}
                      className="inline-flex items-center gap-1.5 bg-[#2F6BFF] hover:bg-[#1a56e8] text-white px-4.5 py-2.5 text-[12.5px] font-bold rounded-xl shadow-[0_4px_12px_rgba(47,107,255,0.15)] hover:shadow-[0_6px_20px_rgba(47,107,255,0.25)] transition-all duration-200"
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
