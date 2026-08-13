import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, HelpCircle } from 'lucide-react';

export default function CandidateTerminatedView() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[760px] mx-auto text-center">
      {/* Result Hero Header */}
      <div className="result-hero rounded-3xl overflow-hidden bg-gradient-to-br from-[#3a1d1d] to-[#5a2630] text-white p-10 relative shadow-xl">
        <div className="seal w-24 h-24 rounded-full mx-auto mb-4.5 flex items-center justify-center bg-[#e04f4f]/10 border-2 border-[#e04f4f] text-[#ff9b9b]">
          <AlertOctagon className="w-12 h-12" />
        </div>
        <span className="eyebrow font-mono text-xs text-[#ffb3b3] tracking-[2px] uppercase">Attempt ended</span>
        <h1 className="font-display font-extrabold text-[38px] mt-2 mb-1">Exam terminated</h1>
        <div className="exam text-[#e9c9c9] text-[15px]">Attempt terminated due to an integrity policy violation.</div>
        <p className="text-[#e9c9c9] text-[13.5px] max-w-[520px] mx-auto mt-3.5 leading-relaxed">
          Your attempt was scored from the answers submitted so far and counts as your attempt for this 30-day window.
        </p>
      </div>

      <div className="three-col grid grid-cols-1 md:grid-cols-3 gap-[18px] mt-6">
        <div className="card pad bg-white shadow-sm flex flex-col text-left">
          <span className="chip bad bg-[#fde8e8] text-[#bb2e2e] w-max mb-2.5">What happened</span>
          <p className="text-[13px] text-[#5C6B82] leading-relaxed">
            Leaving the exam tab three times triggers automatic termination, as explained before you began.
          </p>
        </div>

        <div className="card pad bg-white shadow-sm flex flex-col text-left">
          <span className="chip mute bg-[#eef2f8] text-[#5C6B82] w-max mb-2.5">Your result</span>
          <p className="text-[13px] text-[#5C6B82] leading-relaxed">
            A level has been assigned from your partial answers. Your administrator can see the full detail.
          </p>
        </div>

        <div className="card pad bg-white shadow-sm flex flex-col text-left">
          <span className="chip warn bg-[#fdf3da] text-[#9c7400] w-max mb-2.5">Next attempt</span>
          <p className="text-[13px] text-[#5C6B82] leading-relaxed">
            You can retake this certification in 30 days. If this was a genuine technical fault, contact your administrator for an override.
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-center mt-7">
        <button
          onClick={() => navigate('/candidate/help')}
          className="btn ghost font-semibold text-[13.5px] px-[18px] py-[11px] rounded-xl transition-all"
        >
          Read exam rules
        </button>
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
