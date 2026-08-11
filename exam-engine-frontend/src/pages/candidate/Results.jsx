import React, { useState, useEffect } from 'react';
import { Award, Clock, Calendar } from 'lucide-react';
import { attemptService, candidateService } from '../../services/api';

export default function CandidateResults() {
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
      NOT_PASSED: 'bg-[#fde8e8] text-[#bb2e2e]',
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

      <div className="card pad">
        <table className="tbl">
          <thead>
            <tr>
              <th>Certification</th>
              <th>Date</th>
              <th>Assigned Level</th>
              <th>Result Status</th>
            </tr>
          </thead>
          <tbody>
            {attempts.length > 0 ? (
              attempts.map((attempt) => (
                <tr key={attempt.attemptId}>
                  <td>
                    <div className="font-semibold text-[#0E1B2E]">{attempt.examTitle}</div>
                    <span className="text-[11.5px] text-[#5C6B82] capitalize">{attempt.stack} Stack</span>
                  </td>
                  <td className="mono text-[#5C6B82]">
                    {new Date(attempt.submittedAt).toLocaleDateString()}
                  </td>

                  <td>
                    <span className={`tier-badge flex items-center gap-2 font-bold font-display text-[12px] px-2.5 py-0.5 rounded-full text-white w-max ${getTierColor(attempt.assignedLevel)}`}>
                      <i>{attempt.assignedLevel}</i>
                      <span className="text-[11px] font-medium">
                        {attempt.assignedLevelTitle}
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${getResultBadgeClass(attempt.resultStatus)}`}>
                      {attempt.resultStatus}
                    </span>
                  </td>
                </tr>
              ))
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
