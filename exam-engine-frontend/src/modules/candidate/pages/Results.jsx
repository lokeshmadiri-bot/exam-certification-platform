import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Clock, Eye, Calendar, ShieldAlert, FileText } from 'lucide-react';
import { candidateService } from '../services/api';

export default function CandidateResults() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const attemptsRes = await candidateService.getMyAttempts();
        setAttempts(attemptsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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

  const getResultBadgeClass = (status) => {
    const classes = {
      PASSED: 'bg-[#e7f7f0] text-[#0a7a52] border-[#c3ebd7]',
      FAILED: 'bg-[#fde8e8] text-[#bb2e2e] border-[#f8b4b4]',
      TERMINATED: 'bg-[#fde8e8] text-[#bb2e2e] border-[#f8b4b4]'
    };
    return classes[status] || 'bg-[#eef2f8] text-[#5C6B82] border-[#d2dfef]';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-[#5c6b82] font-semibold">
        <div className="w-8 h-8 border-4 border-[#e4eaf2] border-t-[#2F6BFF] rounded-full animate-spin"></div>
        <span className="font-mono text-xs">Loading results history...</span>
      </div>
    );
  }

  const passedCount = attempts.filter(a => a.resultPublishStatus === 'PUBLISHED' && a.resultStatus === 'PASSED').length;
  const underReviewCount = attempts.filter(a => a.resultPublishStatus !== 'PUBLISHED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div className="page-head">
        <span className="eyebrow font-mono text-[10px] tracking-[2px] uppercase text-[#2F6BFF] bg-[#2F6BFF]/10 px-3 py-1 rounded-full border border-[#2F6BFF]/20 font-bold">
          Credentials & history
        </span>
        <h1 className="font-display font-extrabold text-3xl text-[#0E1B2E] tracking-tight mt-3 mb-1" style={{ fontSize: '28px', fontWeight: '800', color: '#0E1B2E' }}>My Results</h1>
        <p className="text-[#5C6B82] text-sm font-medium">
          Review your historically earned levels, score breakdowns, and attempt outcomes.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div 
          className="bg-white border border-[#E4EAF2] p-5 rounded-2xl flex items-center gap-4 shadow-sm"
          style={{ display: 'flex', alignItems: 'center', padding: '20px', backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px', gap: '16px' }}
        >
          <div className="w-10 h-10 rounded-xl bg-[#2F6BFF]/5 text-[#2F6BFF] flex items-center justify-center shrink-0" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(47, 107, 255, 0.05)', color: '#2F6BFF' }}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="block font-display font-bold text-2xl text-[#0E1B2E] leading-tight" style={{ display: 'block', fontSize: '24px', fontWeight: '700', color: '#0E1B2E' }}>{attempts.length}</span>
            <span className="text-[11.5px] text-[#5C6B82] font-bold uppercase tracking-wide" style={{ fontSize: '11.5px', color: '#5C6B82', fontWeight: '700' }}>Total Attempts</span>
          </div>
        </div>
        <div 
          className="bg-white border border-[#E4EAF2] p-5 rounded-2xl flex items-center gap-4 shadow-sm"
          style={{ display: 'flex', alignItems: 'center', padding: '20px', backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px', gap: '16px' }}
        >
          <div className="w-10 h-10 rounded-xl bg-[#0E9F6E]/5 text-[#0E9F6E] flex items-center justify-center shrink-0" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14, 159, 110, 0.05)', color: '#0E9F6E' }}>
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="block font-display font-bold text-2xl text-[#0E1B2E] leading-tight" style={{ display: 'block', fontSize: '24px', fontWeight: '700', color: '#0E1B2E' }}>{passedCount}</span>
            <span className="text-[11.5px] text-[#5C6B82] font-bold uppercase tracking-wide" style={{ fontSize: '11.5px', color: '#5C6B82', fontWeight: '700' }}>Badges Earned</span>
          </div>
        </div>
        <div 
          className="bg-white border border-[#E4EAF2] p-5 rounded-2xl flex items-center gap-4 shadow-sm"
          style={{ display: 'flex', alignItems: 'center', padding: '20px', backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px', gap: '16px' }}
        >
          <div className="w-10 h-10 rounded-xl bg-[#E0A500]/5 text-[#E0A500] flex items-center justify-center shrink-0" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(224, 165, 0, 0.05)', color: '#E0A500' }}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="block font-display font-bold text-2xl text-[#0E1B2E] leading-tight" style={{ display: 'block', fontSize: '24px', fontWeight: '700', color: '#0E1B2E' }}>{underReviewCount}</span>
            <span className="text-[11.5px] text-[#5C6B82] font-bold uppercase tracking-wide" style={{ fontSize: '11.5px', color: '#5C6B82', fontWeight: '700' }}>Pending Review</span>
          </div>
        </div>
      </div>

      {/* Results Table Card */}
      <div className="bg-white border border-[#E4EAF2] rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '16px' }}>
        <div className="overflow-x-auto">
          <table className="tbl w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E4EAF2] text-[#5C6B82] text-[11px] font-bold font-mono uppercase">
                <th className="py-4 px-5" style={{ padding: '16px 20px' }}>Certification</th>
                <th className="py-4 px-5" style={{ padding: '16px 20px' }}>Date</th>
                <th className="py-4 px-5" style={{ padding: '16px 20px' }}>Assigned Level</th>
                <th className="py-4 px-5" style={{ padding: '16px 20px' }}>Admin Approval State</th>
                <th className="py-4 px-5 text-right" style={{ padding: '16px 20px' }}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F8]">
              {attempts.length > 0 ? (
                attempts.map((attempt) => {
                  const isPublished = attempt.resultPublishStatus === 'PUBLISHED';
                  return (
                    <tr key={attempt.attemptId} className="hover:bg-[#F8FAFC]/50 transition-colors">
                      <td className="py-4.5 px-5" style={{ padding: '18px 20px' }}>
                        <div className="font-bold text-[#0E1B2E] text-sm" style={{ fontWeight: '700' }}>{attempt.examTitle}</div>
                        <span className="inline-block text-[11px] font-bold text-[#5c6b82] bg-[#eef2f8] px-2 py-0.5 rounded mt-1 uppercase tracking-wider">{attempt.stack} Stack</span>
                      </td>
                      <td className="py-4.5 px-5 font-mono text-[#5C6B82] text-xs" style={{ padding: '18px 20px' }}>
                        <div className="flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar className="w-3.5 h-3.5 text-[#5C6B82]/70" />
                          <span>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'In Progress'}</span>
                        </div>
                      </td>
                      <td className="py-4.5 px-5" style={{ padding: '18px 20px' }}>
                        {attempt.resultStatus === 'TERMINATED' ? (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-[#bb2e2e] font-bold bg-[#fde8e8] px-2.5 py-1 rounded-lg border border-[#f8b4b4] uppercase tracking-wide" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #f8b4b4', backgroundColor: '#fde8e8', color: '#bb2e2e', padding: '4px 10px', borderRadius: '8px' }}>
                            <ShieldAlert className="w-3.5 h-3.5 text-[#bb2e2e]" />
                            Terminated
                          </span>
                        ) : !isPublished ? (
                          <span className="text-[11.5px] text-[#9c7400] font-bold bg-[#fdf3da] px-2.5 py-1 rounded-lg border border-[#f5e2b3] inline-flex items-center gap-1.5 uppercase tracking-wide" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #f5e2b3', backgroundColor: '#fdf3da', color: '#9c7400', padding: '4px 10px', borderRadius: '8px' }}>
                            <Clock className="w-3.5 h-3.5 text-[#9c7400]" />
                            Pending Approval
                          </span>
                        ) : (
                          <span className={`tier-badge flex items-center gap-2 font-bold font-display text-[12px] px-3.5 py-0.5 rounded-full text-white shadow-sm ${getTierColor(attempt.assignedLevel)}`}>
                            <i>{attempt.assignedLevel || 'L3'}</i>
                            <span className="text-[11px] font-semibold">
                              {attempt.assignedLevelTitle || 'Intermediate'}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 px-5" style={{ padding: '18px 20px' }}>
                        {!isPublished ? (
                          <span className="inline-block chip font-bold bg-[#fdf3da] text-[#9c7400] border border-[#f5e2b3] px-2.5 py-1 rounded-lg text-[10.5px] uppercase tracking-wide" style={{ border: '1px solid #f5e2b3', backgroundColor: '#fdf3da', color: '#9c7400', padding: '4px 10px', borderRadius: '8px' }}>
                            UNDER REVIEW
                          </span>
                        ) : (
                          <span className={`inline-block chip font-bold px-2.5 py-1 rounded-lg text-[10.5px] uppercase border tracking-wide ${getResultBadgeClass(attempt.resultStatus)}`} style={{ padding: '4px 10px', borderRadius: '8px' }}>
                            {attempt.resultStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 px-5 text-right" style={{ padding: '18px 20px' }}>
                        <button
                          onClick={() => navigate(`/candidate/result-view/${attempt.attemptId}`)}
                          className="inline-flex items-center gap-1.5 bg-[#2F6BFF]/10 hover:bg-[#2F6BFF] text-[#2F6BFF] hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all duration-200"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '12px', fontWeight: '700' }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Result</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-[#5C6B82] font-medium" style={{ textAlign: 'center', padding: '48px 0' }}>
                    No historical certification attempts recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
