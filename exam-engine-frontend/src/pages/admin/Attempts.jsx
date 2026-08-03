import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/api';

export default function AdminAttempts() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttempts() {
      try {
        const res = await attemptService.getAllAttempts();
        setAttempts(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempts();
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

  const getFlagClass = (violations) => {
    if (!violations || violations.length === 0) return 'bg-[#e7f7f0] text-[#0a7a52]';
    if (violations.length >= 3) return 'bg-[#fde8e8] text-[#bb2e2e]';
    return 'bg-[#fdf3da] text-[#9c7400]';
  };

  if (loading) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading attempts...</div>;
  }

  return (
    <div>
      <div className="page-head mb-[22px]">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Records</span>
        <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1">Attempts</h1>
        <p className="text-[#5C6B82] text-sm">
          Every proctored attempt with its score, level and integrity flags. Click a row to open details.
        </p>
      </div>

      <div className="card pad">
        <table className="tbl">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Certification</th>
              <th>Score</th>
              <th>Level</th>
              <th>Result</th>
              <th>Flags</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {attempts.length > 0 ? (
              attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>
                    <div className="who flex items-center gap-2.5">
                      <div className="av w-[34px] h-[34px] rounded-lg bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center font-semibold text-xs shrink-0 uppercase">
                        {attempt.candidate?.fullName?.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <b className="font-semibold text-sm text-[#0E1B2E]">{attempt.candidate?.fullName}</b>
                        <span className="text-[11.5px] text-[#5C6B82] block">{attempt.candidate?.title}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm">{attempt.exam?.title}</td>
                  <td className="mono font-semibold text-[#0E1B2E]">{attempt.score ?? 0}%</td>
                  <td>
                    <span className={`tier-badge flex items-center gap-2 font-bold font-display text-[12px] px-2.5 py-0.5 rounded-full text-white w-max ${getTierColor(attempt.assignedLevel)}`}>
                      <i>{attempt.assignedLevel}</i>
                      <span className="text-[11px] font-medium hidden sm:inline">
                        {attempt.assignedLevel === 'L1' ? 'Expert' :
                         attempt.assignedLevel === 'L2' ? 'Advanced' :
                         attempt.assignedLevel === 'L3' ? 'Intermediate' :
                         attempt.assignedLevel === 'L4' ? 'Beginner' : 'Needs Training'}
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${getResultBadgeClass(attempt.resultStatus)}`}>
                      {attempt.resultStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${getFlagClass(attempt.violations)}`}>
                      {attempt.violations?.length || 0}
                    </span>
                  </td>
                  <td className="mono text-[#5C6B82]">
                    {new Date(attempt.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/admin/review?attemptId=${attempt.id}`)}
                      className="linkish hover:underline text-xs"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-8 text-[#5C6B82]">
                  No attempts logged in system.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
