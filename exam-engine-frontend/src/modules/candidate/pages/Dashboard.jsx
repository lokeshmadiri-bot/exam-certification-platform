import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Award, CheckCircle, Clock, BookOpen, Compass, Shield, Zap } from 'lucide-react';
import { examService, candidateService } from '../services/api';

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, examsRes, attemptsRes] = await Promise.all([
          candidateService.getProfile(),
          examService.getAllExams(),
          candidateService.getMyAttempts()
        ]);

        setCandidate(profileRes.data || null);
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

  const getTierColor = (lvl) => {
    const colors = {
      L1: 'bg-[#0E9F6E]', // Expert
      L2: 'bg-[#57B85A]', // Advanced
      L3: 'bg-[#E0A500]', // Intermediate
      L4: 'bg-[#EA7A3B]', // Beginner
      L5: 'bg-[#E04F4F]'  // Needs Training
    };
    return colors[lvl] || 'bg-slate-500';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-[#5c6b82] font-semibold">
        <div className="w-8 h-8 border-4 border-[#e4eaf2] border-t-[#2F6BFF] rounded-full animate-spin"></div>
        <span className="font-mono text-xs">Loading dashboard workspace...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0a192f] via-[#0f2a4a] to-[#1a3d6c] rounded-[24px] p-8 text-white border border-white/10 shadow-[0_12px_40px_rgba(11,31,56,0.15)]">
        {/* Glow ambient effects */}
        <div className="absolute right-[-100px] bottom-[-100px] w-[350px] h-[350px] rounded-full bg-[#2F6BFF]/20 blur-[120px] pointer-events-none"></div>
        <div className="absolute left-[20%] top-[-80px] w-[200px] h-[200px] rounded-full bg-[#00e5ff]/10 blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[2px] uppercase text-[#7fa6e6] bg-[#2F6BFF]/15 px-3 py-1 rounded-full border border-[#2F6BFF]/30 font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF] animate-pulse"></span>
              Candidate Workspace
            </span>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight mt-1.5 mb-2 leading-tight">
              Welcome back, <span className="bg-gradient-to-r from-white via-[#e2edff] to-[#a5c7fc] bg-clip-text text-transparent">{candidate?.fullName || "Candidate"}</span>
            </h1>
            <p className="text-[#a5b9d7] text-[14.5px] leading-relaxed font-medium">
              Your professional skill pathway is fully active. Choose an available stack below to begin your timed proctored exam, or review your historical result transcripts and earned level badges.
            </p>
          </div>

          <div className="flex gap-4 shrink-0 mt-2 md:mt-0">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-[18px_24px] rounded-2xl flex flex-col min-w-[130px] shadow-sm">
              <span className="n font-display font-extrabold text-3xl text-white leading-tight">
                {attempts.filter(a => a.resultStatus === 'PASSED').length}
              </span>
              <span className="k text-[11px] text-[#8fa9d0] mt-1 uppercase tracking-wider font-semibold font-mono">Badges Earned</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-[18px_24px] rounded-2xl flex flex-col min-w-[130px] shadow-sm">
              <span className="n font-display font-extrabold text-3xl text-white leading-tight">
                {attempts.length}
              </span>
              <span className="k text-[11px] text-[#8fa9d0] mt-1 uppercase tracking-wider font-semibold font-mono">Total Attempts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Exams */}
      <div>
        <div className="sec-title flex items-center justify-between mb-4 mx-0.5">
          <div>
            <h2 className="font-display font-bold text-lg md:text-xl text-[#0E1B2E] tracking-tight">Available Certifications</h2>
            <p className="text-[12.5px] text-[#6b7c96] font-medium mt-0.5">Choose your technology stack to unlock credential levels.</p>
          </div>
          <button 
            onClick={() => navigate('/candidate/catalog')}
            className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#2F6BFF] hover:text-[#1a56e8] bg-[#2F6BFF]/5 hover:bg-[#2F6BFF]/10 px-3.5 py-2 rounded-xl transition-all duration-150"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>View Catalog</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.filter(e => !e.status || e.status === 'ACTIVE' || e.status === 'DRAFT').slice(0, 6).map((exam) => {
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

      {/* Recent Results */}
      <div>
        <div className="sec-title flex items-center justify-between mb-4 mx-0.5">
          <div>
            <h2 className="font-display font-bold text-lg md:text-xl text-[#0E1B2E] tracking-tight">Recent Badges</h2>
            <p className="text-[12.5px] text-[#6b7c96] font-medium mt-0.5">Credentials earned from your successfully completed proctored assessments.</p>
          </div>
          <button 
            onClick={() => navigate('/candidate/results')}
            className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#2F6BFF] hover:text-[#1a56e8] bg-[#2F6BFF]/5 hover:bg-[#2F6BFF]/10 px-3.5 py-2 rounded-xl transition-all duration-150"
          >
            <span>View History</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {attempts.filter(a => a.resultPublishStatus === 'PUBLISHED').length > 0 ? (
            attempts.filter(a => a.resultPublishStatus === 'PUBLISHED').slice(0, 3).map((attempt) => {
              return (
                <div key={attempt.attemptId} className="group flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border border-[#E4EAF2] hover:border-[#2F6BFF]/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="ic w-11 h-11 rounded-xl bg-[#F4F7FC] text-[#2F6BFF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <CheckCircle className="w-5.5 h-5.5 text-[#2F6BFF]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-[15px] text-[#0E1B2E] tracking-tight">{attempt.examTitle} Certification</h4>
                    <div className="d text-[12px] text-[#5C6B82] flex items-center gap-1.5 mt-1 font-medium">
                      <Clock className="w-4 h-4 text-[#5C6B82]/70" />
                      <span>Completed on {new Date(attempt.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 sm:mt-0">
                    <span className={`tier-badge flex items-center gap-2 font-bold font-display text-[12px] px-3.5 py-1 rounded-full text-white shadow-sm ${getTierColor(attempt.assignedLevel)}`}>
                      <i>{attempt.assignedLevel}</i>
                      <span className="text-[11px] font-semibold">
                        {attempt.assignedLevelTitle}
                      </span>
                    </span>
                    <button
                      onClick={() => navigate(`/candidate/result-view/${attempt.attemptId}`)}
                      className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-[#2F6BFF] hover:text-[#1a56e8] bg-[#2F6BFF]/5 hover:bg-[#2F6BFF]/10 px-3.5 py-2 rounded-lg transition-all duration-150"
                    >
                      <span>View Transcript</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-[#E4EAF2] rounded-2xl text-center text-[#5C6B82] text-sm py-10 font-medium shadow-sm">
              You haven't completed any certification attempts yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}