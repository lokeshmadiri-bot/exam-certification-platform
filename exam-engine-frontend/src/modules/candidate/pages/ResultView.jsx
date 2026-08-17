import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, ShieldAlert, Award, ArrowLeft, Calendar } from 'lucide-react';
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
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-[#5c6b82] font-semibold">
        <div className="w-8 h-8 border-4 border-[#e4eaf2] border-t-[#2F6BFF] rounded-full animate-spin"></div>
        <span className="font-mono text-xs">Loading exam result report...</span>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="max-w-[500px] mx-auto text-center py-16 px-6 bg-white border border-[#E4EAF2] rounded-3xl shadow-sm my-12" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div className="text-[#bb2e2e] font-bold text-xl">Exam Result Not Found</div>
        <p className="text-[#5C6B82] text-sm">Could not locate an attempt record for the given ID.</p>
        <button 
          onClick={() => navigate('/candidate')} 
          className="btn bg-[#2F6BFF] hover:bg-[#1a56e8] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
          style={{ padding: '10px 20px', borderRadius: '12px' }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isPublished = attempt.resultPublishStatus === 'PUBLISHED';
  const isPassed = attempt.resultStatus === 'PASSED';
  const isTerminated = attempt.resultStatus === 'TERMINATED';

  return (
    <div className="max-w-7xl mx-auto pb-12" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {/* Result Hero Header */}
      <div 
        className="result-hero rounded-[28px] overflow-hidden text-center relative shadow-xl border"
        style={{
          background: 'linear-gradient(135deg, #0a192f 0%, #0f2a4a 50%, #1a3d6c 100%)',
          color: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          padding: '48px 40px',
          boxShadow: '0 20px 50px rgba(11, 31, 56, 0.18)'
        }}
      >
        {/* Decorative background glow */}
        <div className="absolute right-[-80px] bottom-[-80px] w-[280px] h-[280px] rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: 'rgba(47, 107, 255, 0.15)' }}></div>

        {!isPublished ? (
          /* Under Review / Pending Admin Approval State */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div 
              className="seal w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2 shadow-lg"
              style={{
                borderColor: '#F2A93B',
                backgroundColor: 'rgba(242, 169, 59, 0.08)',
                color: '#F2A93B',
                width: '80px',
                height: '80px',
                marginBottom: '24px',
                boxShadow: '0 0 20px rgba(242, 169, 59, 0.2)'
              }}
            >
              <Clock className="w-10 h-10 animate-pulse" />
            </div>
            <span className="font-mono text-[11px] tracking-[2.5px] uppercase font-bold" style={{ color: '#F2A93B', marginBottom: '12px' }}>
              EXAM SUBMITTED · PENDING ADMIN APPROVAL
            </span>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight" style={{ margin: '8px 0 12px', fontSize: '32px', fontWeight: '800' }}>
              Result Under Review
            </h1>
            <div className="exam text-[15px] font-medium" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '15px', marginBottom: '24px' }}>
              {attempt.examTitle} ({attempt.stack || 'General'})
            </div>

            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs font-bold"
              style={{
                backgroundColor: 'rgba(242, 169, 59, 0.15)',
                border: '1px solid rgba(242, 169, 59, 0.3)',
                color: '#F2A93B'
              }}
            >
              <span className="w-2 h-2 rounded-full bg-[#F2A93B] animate-ping" />
              STATUS: PENDING ADMIN APPROVAL
            </div>
          </div>
        ) : (
          /* Approved / Published Result State */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              className="seal w-22 h-22 rounded-full mx-auto flex items-center justify-center border-2 shadow-lg"
              style={{
                width: '88px',
                height: '88px',
                marginBottom: '24px',
                borderColor: isPassed ? '#34d27b' : '#E04F4F',
                backgroundColor: isPassed ? 'rgba(14, 159, 110, 0.1)' : 'rgba(224, 79, 79, 0.08)',
                color: isPassed ? '#34d27b' : '#E04F4F',
                boxShadow: isPassed ? '0 0 20px rgba(52, 210, 123, 0.2)' : '0 0 20px rgba(224, 79, 79, 0.2)'
              }}
            >
              {isPassed ? <CheckCircle2 className="w-11 h-11" /> : <ShieldAlert className="w-11 h-11" />}
            </div>
            <span className="font-mono text-[11px] tracking-[2.5px] uppercase font-bold" style={{ color: '#86e0b4', marginBottom: '12px' }}>
              {isPassed ? 'CERTIFICATION ISSUED · ADMIN APPROVED' : isTerminated ? 'ATTEMPT TERMINATED' : 'ASSESSMENT COMPLETED · ADMIN APPROVED'}
            </span>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight" style={{ margin: '8px 0 12px', fontSize: '32px', fontWeight: '800' }}>
              {isPassed ? 'Congratulations!' : isTerminated ? 'Attempt Terminated' : 'Result Declared'}
            </h1>
            <div className="exam text-[15px] font-medium" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '15px', marginBottom: '24px' }}>
              {attempt.examTitle}
            </div>

            {attempt.assignedLevel && (
              <div 
                className="inline-flex items-center gap-4 rounded-2xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '14px 22px',
                  borderRadius: '16px'
                }}
              >
                <div className={`lvl w-[54px] h-[54px] rounded-[13px] flex items-center justify-center font-display font-bold text-22px ${getTierColor(attempt.assignedLevel)}`}>
                  {attempt.assignedLevel}
                </div>
                <div className="txt text-left">
                  <b className="font-display font-bold text-lg text-white block">{attempt.assignedLevelTitle || `${attempt.assignedLevel} Competency Level`}</b>
                  {attempt.score !== null && attempt.score !== undefined && (
                    <span className="text-xs font-mono" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Exam Score: {attempt.score} / {attempt.answers?.length || 10}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outcome / Approval Status Card */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <div 
          className="bg-white border border-[#E4EAF2] rounded-2xl flex flex-col shadow-sm"
          style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px' }}
        >
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5C6B82] mb-2" style={{ fontSize: '11px' }}>Admin Approval Status</span>
          <div className="font-display text-lg font-bold text-[#0E1B2E]" style={{ fontSize: '18px', fontWeight: '700' }}>
            {isPublished ? (
              <span className="text-[#0E9F6E] flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0E9F6E' }}>
                <CheckCircle2 className="w-5 h-5 text-[#0E9F6E]" />
                Approved & Published
              </span>
            ) : (
              <span className="text-[#D97706] flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D97706' }}>
                <Clock className="w-5 h-5 text-[#D97706]" />
                Pending Admin Approval
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#5C6B82] leading-relaxed mt-3" style={{ color: '#5C6B82', fontSize: '13px', lineHeight: '1.6', marginTop: '12px' }}>
            {isPublished
              ? 'Your written exam score and proctoring audit logs have been approved by the admin.'
              : 'Your exam submission is currently undergoing administrative review. Results will update automatically once approved.'}
          </p>
        </div>

        <div 
          className="bg-white border border-[#E4EAF2] rounded-2xl flex flex-col shadow-sm"
          style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px' }}
        >
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5C6B82] mb-2" style={{ fontSize: '11px' }}>Attempt Outcome</span>
          <div className="font-display text-lg font-bold text-[#0E1B2E] capitalize" style={{ fontSize: '18px', fontWeight: '700' }}>
            {!isPublished ? (
              <span className="text-[#D97706]" style={{ color: '#D97706' }}>Under Review</span>
            ) : (
              <span className={isPassed ? 'text-[#0E9F6E]' : 'text-[#E04F4F]'} style={{ color: isPassed ? '#0E9F6E' : '#E04F4F' }}>
                {attempt.resultStatus ? attempt.resultStatus.replace('_', ' ').toLowerCase() : 'Submitted'}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#5C6B82] leading-relaxed mt-3" style={{ color: '#5C6B82', fontSize: '13px', lineHeight: '1.6', marginTop: '12px' }}>
            {isPublished
              ? 'Official level certification and badge have been added to your profile.'
              : 'Detailed score breakdown and level badge will be unlocked upon admin approval.'}
          </p>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex flex-wrap gap-4 justify-center" style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
        <button
          onClick={() => navigate('/candidate')}
          className="btn bg-[#2F6BFF] hover:bg-[#1a56e8] text-white font-bold text-[13.5px] px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#2F6BFF', color: '#ffffff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <button
          onClick={() => navigate('/candidate/results')}
          className="btn bg-white hover:bg-[#F4F7FC] text-[#0E1B2E] border border-[#D2DBE5] font-bold text-[13.5px] px-6 py-3 rounded-xl shadow-sm transition-all flex items-center gap-2"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', color: '#0E1B2E', border: '1px solid #D2DBE5', padding: '12px 24px', borderRadius: '12px', fontWeight: '700' }}
        >
          <Award className="w-4 h-4 text-[#2F6BFF]" />
          <span>View All My Results</span>
        </button>
      </div>
    </div>
  );
}
