import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, Monitor, HelpCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { examService } from '../../services/api';

export default function CandidateInstructions() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    async function loadExam() {
      try {
        const res = await examService.getExamById(examId);
        setExam(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadExam();
  }, [examId]);

  const I18N = {
    en: {
      title: "Exam instructions",
      lede: "Please read the rules carefully. You must agree before you can proceed to the camera check.",
      r1t: "Stay on the exam tab",
      r1: "Switching tabs, minimising or resizing the window each count as a strike. After 3 strikes the exam ends automatically.",
      r2t: "Camera & lighting",
      r2: "Sit facing a light source and avoid backlight. Keep your face fully in frame for the whole exam.",
      r3t: "Raise hand if you need help",
      r3: "Use Raise Hand to signal the invigilator. It pauses proctoring and answering. You may raise it up to 5 times.",
      r4t: "Refresh, back or closing = ended",
      r4: "Refreshing the page, pressing back or closing the tab submits your answers and ends the attempt. You cannot re-enter.",
      fmt: "Format at a glance",
      sec: "Sections",
      q: "Questions",
      dur: "Duration",
      autos: "You answer one section at a time and may revisit previous sections before final submission. Your responses are saved automatically while you progress through the exam.",
      agt: "I have read and agree to the rules",
      ag: "Including online proctoring, webcam recording, exam integrity monitoring and automatic termination conditions.",
      proceed: "Proceed to system check"
    }
  };

  const t = I18N.en;

  if (!exam) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#2F6BFF] border-t-transparent"></div>

      <span className="ml-3 text-[#5C6B82] text-sm">
        Loading exam instructions...
      </span>
    </div>;
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <div className="page-head mb-0">
          <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Step 1 of 3</span>
          <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1">
            {exam.title}
          </h1>

          <p className="text-[#5C6B82] text-sm mt-1">
            {exam.stack} Certification
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-6">
        {/* Left Side: Rules list */}
        <div className="card pad space-y-5 bg-white">
          <div className="pb-3 border-b border-[#EEF2F8]">
            <h2 className="font-display font-semibold text-lg text-[#0E1B2E]">{t.title}</h2>
            <p className="text-xs text-[#5C6B82] mt-1">{t.lede}</p>
          </div>

          <div className="space-y-4">
            <div className="instr flex gap-3.5">
              <div className="ic shrink-0 w-[38px] h-[38px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">{t.r1t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-0.5">{t.r1}</p>
              </div>
            </div>

            <div className="instr flex gap-3.5">
              <div className="ic shrink-0 w-[38px] h-[38px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">{t.r2t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-0.5">{t.r2}</p>
              </div>
            </div>

            <div className="instr flex gap-3.5">
              <div className="ic shrink-0 w-[38px] h-[38px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">{t.r3t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-0.5">{t.r3}</p>
              </div>
            </div>

            <div className="instr flex gap-3.5">
              <div className="ic shrink-0 w-[38px] h-[38px] rounded-xl bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">{t.r4t}</b>
                <p className="text-[12.5px] text-[#5C6B82] leading-relaxed mt-0.5">{t.r4}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Format & Consent */}
        <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card pad bg-white">
            <h3 className="font-display font-semibold text-sm text-[#0E1B2E] mb-3.5">{t.fmt}</h3>

            <div className="space-y-2.5 text-[13px] border-b border-[#EEF2F8] pb-3.5">
              <div className="flex justify-between">
                <span className="text-[#5C6B82]">{t.sec}</span>
                <b className="font-mono text-[#0E1B2E] font-semibold">9 sections</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C6B82]">{t.q}</span>
                <b className="font-mono text-[#0E1B2E] font-semibold">{exam.perAttempt} MCQs</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C6B82]">{t.dur}</span>
                <b className="font-mono text-[#0E1B2E] font-semibold">{exam.durationMinutes} minutes</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C6B82]">
                  Passing Score
                </span>

                <b className="font-mono text-[#0E1B2E] font-semibold">
                  {exam.passMark}%
                </b>
              </div>
            </div>

            <p className="text-[11.5px] text-[#5C6B82] leading-relaxed mt-3.5">
              {t.autos}
            </p>
          </div>

          <div className="card pad bg-white">
            <div className="switch">
              <div className="t">
                <b className="block">{t.agt}</b>
                <span className="block mt-0.5">{t.ag}</span>
              </div>
              <span 
                onClick={() => setAgreed(!agreed)}
                className={`toggle ${agreed ? '' : 'off'}`}
              >
                <i />
              </span>
            </div>

            <button
              disabled={!agreed}
              onClick={() => navigate(`/candidate/check/${examId}`)}
              className="btn bg-[#2F6BFF] hover:bg-[#2256d6] disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-1.5 w-full font-semibold text-[13.5px] py-3 rounded-xl shadow-md transition-all"
            >
              <span>{t.proceed}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
