import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
import { attemptService } from '../../services/api';

export default function AdminDashboard() {
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

  if (loading) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading admin dashboard...</div>;
  }

  // Calculate statistics
  const totalAttempts = attempts.length;
  const needsReviewCount = attempts.filter(a => a.violations && a.violations.length > 0 && a.resultStatus !== 'TERMINATED').length;
  const passRate = totalAttempts > 0 
    ? Math.round((attempts.filter(a => a.resultStatus === 'PASSED').length / totalAttempts) * 100) 
    : 0;

  // L1-L5 Distribution
  const rungs = [
    { level: 'L1', title: 'Expert', color: 'var(--t1)', pct: 11 },
    { level: 'L2', title: 'Advanced', color: 'var(--t2)', pct: 23 },
    { level: 'L3', title: 'Intermediate', color: 'var(--t3)', pct: 28 },
    { level: 'L4', title: 'Beginner', color: 'var(--t4)', pct: 22 },
    { level: 'L5', title: 'Needs Training', color: 'var(--t5)', pct: 16 }
  ];

  // Stack data
  const stackAttempts = [
    { name: 'Selenium', count: 320 },
    { name: 'API', count: 270 },
    { name: 'Java', count: 240 },
    { name: 'DevOps', count: 210 },
    { name: 'AI', count: 120 },
    { name: 'Perf', count: 88 }
  ];
  const maxStackCount = Math.max(...stackAttempts.map(s => s.count));

  // Flagged queue
  const flaggedQueue = attempts
    .filter(a => a.violations && a.violations.length > 0)
    .slice(0, 3);

  return (
    <div>
      <div className="page-head mb-[22px]">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Oversight</span>
        <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1">Oversight Dashboard</h1>
        <p className="text-[#5C6B82] text-sm">
          Monitor real-time candidate attempts, grading levels, and proctoring integrity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="stat bg-white border border-[#E4EAF2] rounded-2xl p-[18px] shadow-sm relative overflow-hidden">
          <div className="ic w-[38px] h-[38px] rounded-lg bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center mb-3">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div className="v font-display text-3xl font-bold text-[#0E1B2E]">{totalAttempts}</div>
          <div className="l text-[12.5px] text-[#5C6B82] mt-0.5">Total attempts</div>
        </div>

        <div className="stat bg-white border border-[#E4EAF2] rounded-2xl p-[18px] shadow-sm relative overflow-hidden">
          <div className="ic w-[38px] h-[38px] rounded-lg bg-[#fff3df] text-[#c9831a] flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="v font-display text-3xl font-bold text-[#0E1B2E]">{needsReviewCount}</div>
          <div className="l text-[12.5px] text-[#5C6B82] mt-0.5">Needs review</div>
        </div>

        <div className="stat bg-white border border-[#E4EAF2] rounded-2xl p-[18px] shadow-sm relative overflow-hidden">
          <div className="ic w-[38px] h-[38px] rounded-lg bg-[#e7f7f0] text-[#0E9F6E] flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="v font-display text-3xl font-bold text-[#0E1B2E]">{passRate}%</div>
          <div className="l text-[12.5px] text-[#5C6B82] mt-0.5">Average pass rate</div>
        </div>

        <div className="stat bg-white border border-[#E4EAF2] rounded-2xl p-[18px] shadow-sm relative overflow-hidden">
          <div className="ic w-[38px] h-[38px] rounded-lg bg-[#f0ecff] text-[#6b54d4] flex items-center justify-center mb-3">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="v font-display text-3xl font-bold text-[#0E1B2E]">{attempts.filter(a => a.resultStatus === 'TERMINATED').length}</div>
          <div className="l text-[12.5px] text-[#5C6B82] mt-0.5">Terminated sessions</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-[18px] mb-[18px]">
        {/* Competency Distribution */}
        <div className="card pad bg-white shadow-sm">
          <h2 className="font-display font-semibold text-base text-[#0E1B2E] mb-4">Competency levels</h2>
          <div className="ladder flex flex-col gap-2">
            {rungs.map((rung) => (
              <div key={rung.level} className="rung flex items-center gap-3.5">
                <span className="lv w-[38px] h-[30px] rounded-lg flex items-center justify-center text-white text-xs font-mono font-semibold" style={{ backgroundColor: rung.color }}>
                  {rung.level}
                </span>
                <span className="track flex-1 h-6 bg-[#F4F7FC] border border-[#EEF2F8] rounded-[7px] overflow-hidden">
                  <i className="block h-full rounded-[7px] transition-all" style={{ width: `${rung.pct * 2.6}%`, backgroundColor: rung.color }} />
                </span>
                <span className="name w-[120px] text-[12.5px] text-[#5C6B82]">{rung.title}</span>
                <span className="pct w-12 text-right font-mono text-[12.5px] font-semibold text-[#0E1B2E]">{rung.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stack Chart */}
        <div className="card pad bg-white shadow-sm">
          <h2 className="font-display font-semibold text-base text-[#0E1B2E] mb-1">Attempts by stack</h2>
          <div className="vbars flex items-end gap-3.5 h-[160px] pt-[10px]">
            {stackAttempts.map((stack) => (
              <div key={stack.name} className="b flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="val font-mono text-[11.5px] font-semibold text-[#0E1B2E]">{stack.count}</span>
                <i className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-b from-[#5b8cff] to-[#2F6BFF]" style={{ height: `${(stack.count / maxStackCount) * 100}%` }} />
                <span className="lab text-[11px] text-[#5C6B82]">{stack.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flagged Queue */}
      <div className="card pad bg-white shadow-sm">
        <div className="sec-title flex items-center justify-between mb-3.5">
          <h2 className="font-display font-semibold text-base text-[#0E1B2E]">Needs review</h2>
          <button onClick={() => navigate('/admin/review')} className="text-[12.5px] text-[#2F6BFF] font-semibold hover:underline">
            Open queue &rarr;
          </button>
        </div>
        <div className="flag-list flex flex-col">
          {flaggedQueue.length > 0 ? (
            flaggedQueue.map((flag) => (
              <div key={flag.id} className="flag-row flex items-center gap-3.5 py-3 border-b border-[#EEF2F8] last:border-none">
                <div className="av w-9 h-9 rounded-lg bg-[#fff3df] text-[#c9831a] flex items-center justify-center font-semibold text-xs shrink-0 uppercase">
                  {flag.candidate.fullName?.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <b className="font-semibold text-sm text-[#0E1B2E]">{flag.candidate.fullName}</b>
                  <span className="text-[11.5px] text-[#5C6B82] block">{flag.exam.title} &middot; {flag.violations.length} flags</span>
                </div>
                <button
                  onClick={() => navigate(`/admin/review?attemptId=${flag.id}`)}
                  className="btn ghost ml-auto px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E4EAF2] hover:bg-[#F4F7FC]"
                >
                  Review
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-[#5C6B82] text-sm">No attempts currently flagged for review.</div>
          )}
        </div>
      </div>
    </div>
  );
}
