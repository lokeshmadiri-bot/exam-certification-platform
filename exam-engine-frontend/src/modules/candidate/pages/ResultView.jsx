import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, ShieldAlert, Award, ArrowLeft } from 'lucide-react';
import { candidateService } from '../services/api';

export default function CandidateResultView() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttempt() {
      try {
        const res = await candidateService.getAttemptDetails(attemptId);
        setAttempt(res.data.data || res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId]);

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
    return <div className="text-center py-12 font-mono text-sm text-[#8A99AE]">Loading exam result report...</div>;
  }

  if (!attempt) {
    return (
      <div className="max-w-[500px] mx-auto text-center py-12">
        <div className="text-[#bb2e2e] font-semibold text-lg mb-2">Exam Result Not Found</div>
        <p className="text-[#5C6B82] text-sm mb-6">Could not locate an attempt record for the given ID.</p>
        <button onClick={() => navigate('/candidate')} className="btn bg-[#2F6BFF] text-white px-4 py-2 rounded-xl text-sm font-semibold">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isPublished = attempt.resultPublishStatus === 'PUBLISHED';
  const isPassed = attempt.resultStatus === 'PASSED';
  const isTerminated = attempt.resultStatus === 'TERMINATED';

  return (
    <div className="max-w-[760px] mx-auto pb-10">
      {/* Result Hero Header */}
      <div className="result-hero rounded-3xl overflow-hidden bg-gradient-to-br from-[#0B1F38] to-[#15365e] text-white p-8 md:p-10 text-center relative shadow-xl">
        {!isPublished ? (
          /* Under Review / Pending Admin Approval State */
          <>
            <div className="seal w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-[#F2A93B] bg-[#F2A93B]/10 text-[#F2A93B] shadow-[0_0_20px_rgba(242,169,59,0.3)]">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>
            <span className="eyebrow font-mono text-xs text-[#F2A93B] tracking-[2px] uppercase font-semibold">
              EXAM SUBMITTED · PENDING ADMIN APPROVAL
            </span>
            <h1 className="font-display font-extrabold text-[32px] md:text-[36px] mt-2 mb-1 text-white">
              Result Under Review
            </h1>
            <div className="exam text-[#b9c9e2] text-[15px] font-medium">{attempt.examTitle} ({attempt.stack || 'General'})</div>

            <div className="mt-6 inline-flex items-center gap-2 bg-[#F2A93B]/15 border border-[#F2A93B]/30 text-[#F2A93B] px-4 py-2 rounded-full font-mono text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#F2A93B] animate-ping" />
              STATUS: PENDING ADMIN APPROVAL
            </div>
          </>
        ) : (
          /* Approved / Published Result State */
          <>
            <div
              className={`seal w-22 h-22 rounded-full mx-auto mb-4 flex items-center justify-center border-2 ${
                isPassed ? 'bg-[#0e9f6e]/15 border-[#34d27b] text-[#34d27b]' : 'bg-[#fde8e8]/10 border-[#E04F4F] text-[#E04F4F]'
              }`}
            >
              {isPassed ? <CheckCircle2 className="w-11 h-11" /> : <ShieldAlert className="w-11 h-11" />}
            </div>
            <span className="eyebrow font-mono text-xs text-[#86e0b4] tracking-[2px] uppercase font-semibold">
              {isPassed ? 'CERTIFICATION ISSUED · ADMIN APPROVED' : isTerminated ? 'ATTEMPT TERMINATED' : 'ASSESSMENT COMPLETED · ADMIN APPROVED'}
            </span>
            <h1 className="font-display font-extrabold text-[34px] md:text-[38px] mt-2 mb-1">
              {isPassed ? 'Congratulations!' : isTerminated ? 'Attempt Terminated' : 'Result Declared'}
            </h1>
            <div className="exam text-[#b9c9e2] text-[15px]">{attempt.examTitle}</div>

            {attempt.assignedLevel && (
              <div className="tierwrap inline-flex items-center gap-3.5 mt-6 bg-white/5 border border-white/10 rounded-2xl p-[14px_22px]">
                <div className={`lvl w-[54px] h-[54px] rounded-[13px] flex items-center justify-center font-display font-bold text-22px ${getTierColor(attempt.assignedLevel)}`}>
                  {attempt.assignedLevel}
                </div>
                <div className="txt text-left">
                  <b className="font-display font-bold text-lg text-white block">{attempt.assignedLevelTitle || `${attempt.assignedLevel} Competency Level`}</b>
                  {attempt.score !== null && attempt.score !== undefined && (
                    <span className="text-xs text-[#b9c9e2] font-mono">Exam Score: {attempt.score}%</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Outcome / Approval Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="card pad bg-white shadow-sm flex flex-col border border-[#E4EAF2] rounded-2xl p-5">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5C6B82] mb-1">Admin Approval Status</span>
          <div className="font-display text-lg font-bold text-[#0E1B2E]">
            {isPublished ? (
              <span className="text-[#0E9F6E] flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-[#0E9F6E]" />
                Approved & Published
              </span>
            ) : (
              <span className="text-[#D97706] flex items-center gap-1.5">
                <Clock className="w-5 h-5 text-[#D97706]" />
                Pending Admin Approval
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-2">
            {isPublished
              ? 'Your written exam score and proctoring audit logs have been approved by the admin.'
              : 'Your exam submission is currently undergoing administrative review. Results will update automatically once approved.'}
          </p>
        </div>

        <div className="card pad bg-white shadow-sm flex flex-col border border-[#E4EAF2] rounded-2xl p-5">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5C6B82] mb-1">Attempt Outcome</span>
          <div className="font-display text-lg font-bold text-[#0E1B2E] capitalize">
            {!isPublished ? (
              <span className="text-[#D97706]">Under Review</span>
            ) : (
              <span className={isPassed ? 'text-[#0E9F6E]' : 'text-[#E04F4F]'}>
                {attempt.resultStatus ? attempt.resultStatus.replace('_', ' ').toLowerCase() : 'Submitted'}
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-2">
            {isPublished
              ? 'Official level certification and badge have been added to your profile.'
              : 'Detailed score breakdown and level badge will be unlocked upon admin approval.'}
          </p>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex flex-wrap gap-3 justify-center mt-7">
        <button
          onClick={() => navigate('/candidate')}
          className="btn bg-[#2F6BFF] hover:bg-[#2256d6] text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <button
          onClick={() => navigate('/candidate/results')}
          className="btn bg-white hover:bg-[#F4F7FC] text-[#0E1B2E] border border-[#D2DBE5] font-semibold text-[13.5px] px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Award className="w-4 h-4 text-[#2F6BFF]" />
          <span>View All My Results</span>
        </button>
      </div>
    </div>
  );
}
