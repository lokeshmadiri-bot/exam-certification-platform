import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Play, Award, CheckCircle, Clock, BookOpen, Compass, Shield } from 'lucide-react';
import { examService, candidateService } from '../services/api';

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const { searchQuery } = useOutletContext();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);

  const getUniqueBadges = (attemptsList) => {
    const uniqueKeys = new Set();
    const uniqueBadges = [];
    for (const attempt of attemptsList) {
      if (attempt.resultStatus === 'PASSED' && attempt.resultPublishStatus === 'PUBLISHED' && attempt.assignedLevel) {
        const key = `${attempt.stack?.toLowerCase()}-${attempt.assignedLevel?.toLowerCase()}`;
        if (!uniqueKeys.has(key)) {
          uniqueKeys.add(key);
          uniqueBadges.push(attempt);
        }
      }
    }
    return uniqueBadges;
  };

  const uniqueBadges = getUniqueBadges(attempts);
  const filteredUniqueBadges = uniqueBadges.filter(
    (attempt) =>
      !searchQuery ||
      attempt.examTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (attempt.stack && attempt.stack.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredExams = exams.filter(
    (exam) =>
      exam.status === 'ACTIVE' &&
      (!searchQuery ||
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.stack && exam.stack.toLowerCase().includes(searchQuery.toLowerCase())))
  );

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
    const STACK_ICONS = { java: "☕", react: "⚛", python: "🐍", node: "⬡", sql: "🗄" };
    const STACK_BG = { java: "#fdf6e7", react: "#eaf2fb", python: "#e9f5ee", node: "#f0f6ee", sql: "#f0ecfb" };
    const key = stack ? stack.toLowerCase() : '';
    return {
      icon: STACK_ICONS[key] || "📝",
      bg: STACK_BG[key] || "#eef3f9",
      fg: "#0E1B2E"
    };
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

  const getLevelTitle = (lvl) => {
    const titles = {
      L1: 'Expert',
      L2: 'Advanced',
      L3: 'Intermediate',
      L4: 'Beginner',
      L5: 'Needs Training'
    };
    return titles[lvl] || 'Intermediate';
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
    <div className="space-y-8 max-w-7xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Banner */}
      <div 
        className="relative overflow-hidden rounded-[24px] border"
        style={{
          background: 'linear-gradient(135deg, #0a192f 0%, #0f2a4a 50%, #1a3d6c 100%)',
          color: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: '0 12px 40px rgba(11, 31, 56, 0.15)',
          padding: '32px 36px'
        }}
      >
        {/* Glow ambient effects */}
        <div className="absolute right-[-100px] bottom-[-100px] w-[350px] h-[350px] rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'rgba(47, 107, 255, 0.2)' }}></div>
        <div className="absolute left-[20%] top-[-80px] w-[200px] h-[200px] rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)' }}></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'between', gap: '24px' }}>
          <div className="max-w-xl" style={{ flex: '1', minWidth: '280px' }}>
            <span 
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[2px] uppercase px-3 py-1 rounded-full font-semibold mb-4"
              style={{
                backgroundColor: 'rgba(47, 107, 255, 0.25)',
                color: '#7fa6e6',
                border: '1px solid rgba(47, 107, 255, 0.4)'
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF] animate-pulse"></span>
              Candidate Workspace
            </span>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight mt-1.5 mb-2 leading-tight" style={{ color: '#ffffff', margin: '6px 0 12px' }}>
              Welcome back, <span style={{ color: '#ffffff', fontWeight: '800' }}>{candidate?.fullName || "Candidate"}</span>
            </h1>
            <p className="text-[14.5px] leading-relaxed font-medium" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14.5px', lineHeight: '1.6' }}>
              Your professional skill pathway is fully active. Choose an available stack below to begin your timed proctored exam, or review your historical result transcripts and earned level badges.
            </p>
          </div>

          <div className="flex gap-4 shrink-0" style={{ display: 'flex', gap: '16px', flexShrink: '0' }}>
            <div 
              className="p-[18px_24px] rounded-2xl flex flex-col min-w-[130px] shadow-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '18px 24px',
                borderRadius: '16px'
              }}
            >
              <span className="font-display font-extrabold text-3xl leading-tight" style={{ color: '#ffffff', fontSize: '30px', fontWeight: '800' }}>
                {uniqueBadges.length}
              </span>
              <span className="text-[11px] mt-1 uppercase tracking-wider font-semibold font-mono" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>Badges Earned</span>
            </div>
            <div 
              className="p-[18px_24px] rounded-2xl flex flex-col min-w-[130px] shadow-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '18px 24px',
                borderRadius: '16px'
              }}
            >
              <span className="font-display font-extrabold text-3xl leading-tight" style={{ color: '#ffffff', fontSize: '30px', fontWeight: '800' }}>
                {attempts.length}
              </span>
              <span className="text-[11px] mt-1 uppercase tracking-wider font-semibold font-mono" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>Total Attempts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Exams */}
      <div>
        <div className="sec-title flex items-center justify-between mb-4 mx-0.5" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 className="font-display font-bold text-lg md:text-xl text-[#0E1B2E] tracking-tight" style={{ fontSize: '18px', fontWeight: '700' }}>Available Certifications</h2>
            <p className="text-[12.5px] text-[#6b7c96] font-medium mt-0.5">Choose your technology stack to unlock credential levels.</p>
          </div>
        </div>

        <div 
          className={filteredExams.length > 5 ? "flex overflow-x-auto gap-6 pb-4 no-scrollbar scroll-smooth" : "grid"} 
          style={
            filteredExams.length > 5 
              ? { display: 'flex', overflowX: 'auto', gap: '24px', paddingBottom: '16px' }
              : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }
          }
        >
          {filteredExams.length > 0 ? (
            filteredExams.map((exam) => {
              const styleIcon = getStackIcon(exam.stack);
              const lastAttempt = attempts.find(a => a.examId === exam.examId);
              const canAttempt = lastAttempt?.canAttempt ?? true;
              const daysLeft = lastAttempt?.retryDaysLeft ?? 0;
              const isScrollable = filteredExams.length > 5;

              return (
                <div 
                  key={exam.examId} 
                  className="group relative bg-white border border-[#E4EAF2] hover:border-[#2F6BFF]/40 rounded-2xl p-6 shadow-sm hover:shadow-[0_12px_28px_rgba(47,107,255,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #E4EAF2',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                    ...(isScrollable ? { minWidth: '340px', flex: '0 0 auto' } : {})
                  }}
                >
                  <div className="top flex items-start justify-between gap-4 mb-4" style={{ display: 'flex', alignItems: 'start', justifyContent: 'between', gap: '16px', marginBottom: '16px' }}>
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
                          <Clock className="w-3.5 h-3.5 text-[#c9831a]" />
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
                          onClick={() => navigate(`/candidate/instructions/${exam.examId}`)}
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
            })
          ) : (
            <div className="col-span-full bg-white border border-[#E4EAF2] rounded-2xl text-center text-[#5C6B82] text-sm py-10 font-medium shadow-sm w-full" style={{ gridColumn: '1 / -1', padding: '40px', backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px' }}>
              No matching Available Certifications found.
            </div>
          )}
        </div>
      </div>

      {/* Recent Badges */}
      <div>
        <div className="sec-title flex items-center justify-between mb-4 mx-0.5" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 className="font-display font-bold text-lg md:text-xl text-[#0E1B2E] tracking-tight" style={{ fontSize: '18px', fontWeight: '700' }}>Recent Badges</h2>
            <p className="text-[12.5px] text-[#6b7c96] font-medium mt-0.5">Credentials earned from your successfully completed proctored assessments.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredUniqueBadges.length > 0 ? (
            filteredUniqueBadges.slice(0, 3).map((attempt) => {
              return (
                <div 
                  key={attempt.attemptId} 
                  className="group flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border border-[#E4EAF2] hover:border-[#2F6BFF]/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '20px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #E4EAF2',
                    borderRadius: '16px',
                    gap: '16px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div className="ic w-11 h-11 rounded-xl bg-[#F4F7FC] text-[#2F6BFF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200" style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FC' }}>
                    <CheckCircle className="w-5.5 h-5.5 text-[#2F6BFF]" />
                  </div>
                  <div className="flex-1" style={{ flex: '1' }}>
                    <h4 className="font-bold text-[15px] text-[#0E1B2E] tracking-tight" style={{ fontSize: '15px', fontWeight: '700', color: '#0E1B2E', margin: '0' }}>{attempt.examTitle} Certification</h4>
                    <div className="d text-[12px] text-[#5C6B82] flex items-center gap-1.5 mt-1 font-medium" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#5C6B82', marginTop: '4px' }}>
                      <Clock className="w-4 h-4 text-[#5C6B82]/70" />
                      <span>Completed on {new Date(attempt.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 sm:mt-0" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`tier-badge flex items-center gap-2 font-bold font-display text-[12px] px-3.5 py-1 rounded-full text-white shadow-sm ${getTierColor(attempt.assignedLevel)}`}>
                      <i>{attempt.assignedLevel}</i>
                      <span className="text-[11px] font-semibold">
                        {attempt.assignedLevelTitle || getLevelTitle(attempt.assignedLevel)}
                      </span>
                    </span>
                    <button
                      onClick={() => navigate(`/candidate/result-view/${attempt.attemptId}`)}
                      className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-[#2F6BFF] hover:text-[#1a56e8] bg-[#2F6BFF]/5 hover:bg-[#2F6BFF]/10 px-3.5 py-2 rounded-lg transition-all duration-150"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2F6BFF', backgroundColor: 'rgba(47, 107, 255, 0.05)', padding: '6px 12px', borderRadius: '8px', fontWeight: '750' }}
                    >
                      <span>View Transcript</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-[#E4EAF2] rounded-2xl text-center text-[#5C6B82] text-sm py-10 font-medium shadow-sm" style={{ padding: '40px', backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px' }}>
              No matching badges found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}