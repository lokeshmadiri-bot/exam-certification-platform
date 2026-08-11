import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Clock, Eye } from 'lucide-react';
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
      PASSED: 'bg-[#e7f7f0] text-[#0a7a52]',
      FAILED: 'bg-[#fde8e8] text-[#bb2e2e]',
      TERMINATED: 'bg-[#fde8e8] text-[#bb2e2e]'
    };
    return classes[status] || 'bg-[#eef2f8] text-[#5C6B82]';
  };

  if (loading) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading results...</div>;
  }

  return (
    <div>
      <div className="page-head mb-[22px]">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">My history</span>
        <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1">My Results</h1>
        <p className="text-[#5C6B82] text-sm">
          Review your historically earned levels, score breakdowns, and attempt outcomes.
        </p>
      </div>

      <div className="card pad bg-white border border-[#E4EAF2] rounded-2xl shadow-sm overflow-hidden">
        <table className="tbl w-full text-left">
          <thead>
            <tr className="border-b border-[#EEF2F8] text-[#5C6B82] text-xs font-mono uppercase">
              <th className="py-3 px-4">Certification</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Assigned Level</th>
              <th className="py-3 px-4">Admin Approval State</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {attempts.length > 0 ? (
              attempts.map((attempt) => {
                const isPublished = attempt.resultPublishStatus === 'PUBLISHED';
                return (
                  <tr key={attempt.attemptId} className="border-b border-[#EEF2F8] hover:bg-[#F8FAFC]">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#0E1B2E]">{attempt.examTitle}</div>
                      <span className="text-[11.5px] text-[#5C6B82] capitalize">{attempt.stack} Stack</span>
                    </td>
                    <td className="py-3.5 px-4 mono text-[#5C6B82] text-xs">
                      {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'In Progress'}
                    </td>
                    <td className="py-3.5 px-4">
                      {attempt.resultStatus === 'TERMINATED' ? (
                        <span className="text-[12px] text-[#bb2e2e] font-semibold bg-[#fde8e8] px-2.5 py-0.5 rounded-full border border-[#f8b4b4]">None (Terminated)</span>
                      ) : !isPublished ? (
                        <span className="text-[12px] text-[#9c7400] font-semibold bg-[#fdf3da] px-2.5 py-0.5 rounded-full border border-[#f5e2b3] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending Admin Approval
                        </span>
                      ) : (
                        <span className={`tier-badge flex items-center gap-2 font-bold font-display text-[12px] px-2.5 py-0.5 rounded-full text-white w-max ${getTierColor(attempt.assignedLevel)}`}>
                          <i>{attempt.assignedLevel || 'L3'}</i>
                          <span className="text-[11px] font-medium">
                            {attempt.assignedLevelTitle || 'Intermediate'}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {!isPublished ? (
                        <span className="chip warning bg-[#fdf3da] text-[#9c7400] font-semibold px-2.5 py-1 rounded-full text-xs">
                          UNDER REVIEW
                        </span>
                      ) : (
                        <span className={`chip font-semibold px-2.5 py-1 rounded-full text-xs ${getResultBadgeClass(attempt.resultStatus)}`}>
                          {attempt.resultStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/candidate/result-view/${attempt.attemptId}`)}
                        className="btn bg-[#2F6BFF]/10 hover:bg-[#2F6BFF]/20 text-[#2F6BFF] font-semibold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all"
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
                <td colSpan="5" className="text-center py-8 text-[#5C6B82]">
                  No historical attempts recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
