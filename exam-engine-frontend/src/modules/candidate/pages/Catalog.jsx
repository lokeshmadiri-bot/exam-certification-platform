import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Play } from 'lucide-react';
import { examService, attemptService, candidateService } from '../services/api';

export default function CandidateCatalog() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const examsRes = await examService.getAllExams();
        const attemptsRes = await candidateService.getMyAttempts();
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
    const configs = {
      selenium: { bg: '#eaf1ff', fg: '#2F6BFF' },
      api: { bg: '#e7f7f0', fg: '#0E9F6E' },
      java: { bg: '#fdf3da', fg: '#b58600' },
      devops: { bg: '#f0ecff', fg: '#6b54d4' }
    };
    return configs[stack] || { bg: '#eef2f8', fg: '#5C6B82' };
  };



  if (loading) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading catalog...</div>;
  }

  return (
    <div>
      <div className="page-head mb-[22px]">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Catalogue</span>
        <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1">Exam Catalogue</h1>
        <p className="text-[#5C6B82] text-sm">
          Browse certifications across all tech stacks. Active candidates can attempt each exam once per 30-day window.
        </p>
      </div>

      <div className="exam-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.filter(e => !e.status || e.status === 'ACTIVE' || e.status === 'DRAFT').map((exam) => {
          const style = getStackIcon(exam.stack);
          const lastAttempt = attempts.find(
            a => a.examId === exam.examId
          );

          const canAttempt = lastAttempt?.canAttempt ?? true;

          const daysLeft = lastAttempt?.retryDaysLeft ?? 0;

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
    </div>
  );
}
