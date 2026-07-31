import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Award, CheckCircle, Clock } from 'lucide-react';
import { examService, candidateService } from '../../services/api';

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
    // Return SVG details or color representations based on stack name
    const configs = {
      selenium: { bg: '#eaf1ff', fg: '#2F6BFF' },
      api: { bg: '#e7f7f0', fg: '#0E9F6E' },
      java: { bg: '#fdf3da', fg: '#b58600' },
      devops: { bg: '#f0ecff', fg: '#6b54d4' }
    };
    return configs[stack] || { bg: '#eef2f8', fg: '#5C6B82' };
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
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading dashboard...</div>;
  }



  return (
    <div>
      {/* Banner */}
      <div className="hero-greet bg-gradient-to-r from-[#0B1F38] to-[#15365e] rounded-[20px] p-[26px_28px] text-white relative overflow-hidden mb-[22px]">
        <div className="wm absolute -right-[30px] -bottom-[50px] w-[230px] h-[230px] rounded-full bg-gradient-radial from-[#2F6BFF]/30 to-transparent"></div>
        <span className="eyebrow font-mono text-[11px] tracking-[1.4px] uppercase text-[#7fa6e6]">Candidate Dashboard</span>
        <h1 className="font-display font-bold text-[25px] mt-1.5 mb-1">Welcome back, {candidate?.fullName || "Candidate"}</h1>
        <p className="text-[#b9c9e2] text-[13.5px] max-w-[560px] leading-relaxed">
          Your skill path is fully active. Select a stack below to start your timed certification, or view your historical badges.
        </p>

        <div className="meta flex gap-[22px] mt-[18px]">
          <div>
            <span className="n font-display font-bold text-xl">{attempts.filter(a => a.resultStatus === 'PASSED').length}</span>
            <span className="k text-[11.5px] text-[#8fa9d0]">Badges Earned</span>
          </div>
          <div className="border-l border-white/10 pl-6">
            <span className="n font-display font-bold text-xl">{attempts.length}</span>
            <span className="k text-[11.5px] text-[#8fa9d0]">Attempts Logged</span>
          </div>
        </div>
      </div>

      {/* Available Exams */}
      <div className="sec-title flex items-center justify-between mb-3.5 mx-0.5">
        <h2 className="font-display font-semibold text-lg text-[#0E1B2E]">Available Certifications</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {exams.filter(e => e.status === 'ACTIVE').slice(0, 3).map((exam) => {
          const style = getStackIcon(exam.stack);
          const lastAttempt =
            attempts.find(a => a.examId === exam.examId);

          const canAttempt =
            lastAttempt?.canAttempt ?? true;

          const daysLeft =
            lastAttempt?.retryDaysLeft ?? 0;

          return (
            <div key={exam.examId} className="exam-card bg-white border border-[#E4EAF2] rounded-2xl p-[18px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col">
              <div className="top flex items-center gap-3 mb-3.5">
                <div className="ic w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: style.bg, color: style.fg }}>
                  <Award className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-[15.5px] text-[#0E1B2E]">{exam.title}</h3>
                  <div className="sub text-[11.5px] text-[#5C6B82] capitalize">{exam.stack} Certification</div>
                </div>
              </div>

              <div className="facts flex gap-4 my-4 text-xs text-[#5C6B82]">
                <span>Duration <b className="text-[#0E1B2E] font-mono font-semibold">{exam.durationMinutes}m</b></span>
                <span>Questions <b className="text-[#0E1B2E] font-mono font-semibold">{exam.perAttempt}</b></span>
              </div>

              <div className="foot mt-auto flex items-center justify-between">
                {!canAttempt ? (
                  <>
                    <span className="chip warn bg-[#fdf3da] text-[#9c7400]">Locked · {daysLeft}d left</span>
                    <button className="btn ghost cursor-not-allowed opacity-50 px-3.5 py-2 text-[12.5px] font-semibold rounded-lg" disabled>
                      Unavailable
                    </button>
                  </>
                ) : (
                  <>
                    <span className="chip ok bg-[#e7f7f0] text-[#0a7a52]">Available</span>
                    <button
                      onClick={() => navigate(`/candidate/instructions/${exam.examId}`)}
                      className="btn bg-[#2F6BFF] hover:bg-[#2256d6] text-white flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold rounded-lg shadow-sm"
                    >
                      <span>Start</span>
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Results */}
      <div className="sec-title flex items-center justify-between mb-3.5 mx-0.5">
        <h2 className="font-display font-semibold text-lg text-[#0E1B2E]">Recent Badges</h2>
      </div>

      <div className="result-list flex flex-col gap-2.5">
        {attempts.filter(a => a.resultStatus !== 'IN_PROGRESS').length > 0 ? (
          attempts.filter(a => a.resultStatus !== 'IN_PROGRESS').slice(0, 3).map((attempt) => {
            const style = getStackIcon(attempt.stack);
            return (
              <div key={attempt.attemptId} className="result-row flex items-center gap-3.5 p-[14px_16px] bg-white border border-[#E4EAF2] rounded-2xl shadow-sm">
                <div className="ic w-10 h-10 rounded-xl bg-[#F4F7FC] text-[#2F6BFF] flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-[#2F6BFF]" />
                </div>
                <div>
                  <b className="font-semibold text-sm text-[#0E1B2E]">{attempt.examTitle} Certification</b>
                  <div className="d text-[11.5px] text-[#5C6B82] flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Completed on {new Date(attempt.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`tier-badge ml-auto flex items-center gap-2 font-bold font-display text-[13px] px-3 py-1 rounded-full text-white ${getTierColor(attempt.assignedLevel)}`}>
                  <i>{attempt.assignedLevel}</i>
                  <span className="text-[11.5px] font-medium hidden sm:inline">
                    {attempt.assignedLevelTitle}
                  </span>
                </span>
              </div>
            );
          })
        ) : (
          <div className="card pad text-center text-[#5C6B82] text-sm py-8">
            You haven't completed any certification attempts yet.
          </div>
        )}
      </div>
    </div>
  );
}