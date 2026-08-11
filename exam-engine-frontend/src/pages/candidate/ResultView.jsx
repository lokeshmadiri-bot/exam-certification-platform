import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { candidateService } from '../../services/api';

export default function CandidateResultView() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttempt() {
      try {
        const res = await candidateService.getAttemptDetails(attemptId);
        setAttempt(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId]);

  const getResultInfo = (status) => {
    switch (status) {
      case "PASSED":
        return {
          eyebrow: "Certification Issued",
          title: "Congratulations!",
          iconBg: "bg-[#0e9f6e]/10",
          iconBorder: "border-[#0e9f6e]",
          iconColor: "text-[#34d27b]"
        };

      case "FAILED":
        return {
          eyebrow: "Assessment Completed",
          title: "Result Declared",
          iconBg: "bg-[#fde8e8]",
          iconBorder: "border-[#E04F4F]",
          iconColor: "text-[#E04F4F]"
        };

      case "TERMINATED":
        return {
          eyebrow: "Assessment Terminated",
          title: "Attempt Terminated",
          iconBg: "bg-[#fde8e8]",
          iconBorder: "border-[#E04F4F]",
          iconColor: "text-[#E04F4F]"
        };

      default:
        return {
          eyebrow: "Assessment Completed",
          title: "Result Available",
          iconBg: "bg-[#eef2f8]",
          iconBorder: "border-[#5C6B82]",
          iconColor: "text-[#5C6B82]"
        };
    }
  };

  if (loading) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading score report...</div>;
  }

  if (!attempt) {
    return <div className="text-center py-10 text-[#bb2e2e]">Score report not found.</div>;
  }

  const resultInfo = getResultInfo(attempt.resultStatus);

  return (
    <div className="max-w-[760px] mx-auto">
      {/* Result Hero Header */}
      <div className="result-hero rounded-3xl overflow-hidden bg-gradient-to-br from-[#0B1F38] to-[#15365e] text-white p-10 text-center relative shadow-xl">
        <div
          className={`seal w-24 h-24 rounded-full mx-auto mb-4.5 flex items-center justify-center border-2 ${resultInfo.iconBg} ${resultInfo.iconBorder} ${resultInfo.iconColor}`}
        >
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <span className="eyebrow font-mono text-xs text-[#86e0b4] tracking-[2px] uppercase">{resultInfo.eyebrow}</span>
        <h1 className="font-display font-extrabold text-[38px] mt-2 mb-1">{resultInfo.title}</h1>
        <div className="exam text-[#b9c9e2] text-[15px]">{attempt.examTitle}</div>

        <div className="tierwrap inline-flex items-center gap-3.5 mt-6 bg-white/5 border border-white/10 rounded-2xl p-[14px_22px]">
          <div className={`lvl w-[54px] h-[54px] rounded-[13px] flex items-center justify-center font-display font-bold text-22px ${getTierColor(attempt.assignedLevel)}`}>
            {attempt.assignedLevel}
          </div>
          <div className="txt text-left">
            <b className="font-display font-bold text-lg text-white block">{attempt.assignedLevelTitle}</b>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-6">

        <div className="card pad bg-white shadow-sm flex flex-col">
          <span className="chip mute bg-[#eef2f8] text-[#5C6B82] w-max mb-2.5">Outcome</span>
          <div className="font-display text-lg font-bold text-[#0E1B2E] capitalize">{attempt.resultStatus.replace('_', ' ').toLowerCase()}</div>
          <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-2">
            Your results are audited and added to your learning profile.
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
