import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { attemptService } from '../../services/api';

export default function CandidateResultView() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttempt() {
      try {
        const res = await attemptService.getAttemptDetail(attemptId);
        setAttempt(res.data.attempt);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId]);

  if (loading) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading score report...</div>;
  }

  if (!attempt) {
    return <div className="text-center py-10 text-[#bb2e2e]">Score report not found.</div>;
  }

  const getTierDetails = (lvl) => {
    const details = {
      L1: { title: 'Expert', bg: 'bg-[#0E9F6E]', text: 'Expert Level 1' },
      L2: { title: 'Advanced', bg: 'bg-[#57B85A]', text: 'Advanced Level 2' },
      L3: { title: 'Intermediate', bg: 'bg-[#E0A500]', text: 'Intermediate Level 3' },
      L4: { title: 'Beginner', bg: 'bg-[#EA7A3B]', text: 'Beginner Level 4' },
      L5: { title: 'Needs Training', bg: 'bg-[#E04F4F]', text: 'Needs Training Level 5' }
    };
    return details[lvl] || { title: 'Unknown', bg: 'bg-slate-500', text: 'Level' };
  };

  const levelInfo = getTierDetails(attempt.assignedLevel);

  return (
    <div className="max-w-[760px] mx-auto">
      {/* Result Hero Header */}
      <div className="result-hero rounded-3xl overflow-hidden bg-gradient-to-br from-[#0B1F38] to-[#15365e] text-white p-10 text-center relative shadow-xl">
        <div className="seal w-24 h-24 rounded-full mx-auto mb-4.5 flex items-center justify-center bg-[#0e9f6e]/10 border-2 border-[#0e9f6e] text-[#34d27b]">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <span className="eyebrow font-mono text-xs text-[#86e0b4] tracking-[2px] uppercase">Certification Issued</span>
        <h1 className="font-display font-extrabold text-[38px] mt-2 mb-1">Result declared</h1>
        <div className="exam text-[#b9c9e2] text-[15px]">{attempt.exam.title}</div>
        
        <div className="tierwrap inline-flex items-center gap-3.5 mt-6 bg-white/5 border border-white/10 rounded-2xl p-[14px_22px]">
          <div className={`lvl w-[54px] h-[54px] rounded-[13px] flex items-center justify-center font-display font-bold text-22px ${levelInfo.bg}`}>
            {attempt.assignedLevel}
          </div>
          <div className="txt text-left">
            <b className="font-display font-bold text-lg text-white block">{levelInfo.title}</b>
            <span className="text-[#b9c9e2] text-[12.5px] block">{levelInfo.text}</span>
          </div>
        </div>
      </div>

      <div className="three-col grid grid-cols-1 md:grid-cols-3 gap-[18px] mt-6">
        <div className="card pad bg-white shadow-sm flex flex-col">
          <span className="chip ok bg-[#e7f7f0] text-[#0a7a52] w-max mb-2.5">Your Score</span>
          <div className="font-mono text-3xl font-bold text-[#0E1B2E]">{attempt.score}%</div>
          <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-2">
            Graded against passing threshold of {attempt.exam.passMark}%.
          </p>
        </div>

        <div className="card pad bg-white shadow-sm flex flex-col">
          <span className="chip mute bg-[#eef2f8] text-[#5C6B82] w-max mb-2.5">Outcome</span>
          <div className="font-display text-lg font-bold text-[#0E1B2E] capitalize">{attempt.resultStatus.replace('_', ' ').toLowerCase()}</div>
          <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-2">
            Your results are audited and added to your learning profile.
          </p>
        </div>

        <div className="card pad bg-white shadow-sm flex flex-col">
          <span className="chip warn bg-[#fdf3da] text-[#9c7400] w-max mb-2.5">Integrity</span>
          <div className="font-mono text-3xl font-bold text-[#0E1B2E]">{attempt.tabSwitchCount}</div>
          <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-2">
            Minor flags recorded. These are logged for administrator review.
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-center mt-7">
        <button
          onClick={() => navigate('/candidate')}
          className="btn bg-[#2F6BFF] hover:bg-[#2256d6] text-white font-semibold text-[13.5px] px-[18px] py-[11px] rounded-xl shadow-md transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
