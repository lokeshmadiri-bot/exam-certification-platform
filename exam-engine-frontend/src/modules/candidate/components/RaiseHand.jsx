import React from 'react';
import { Monitor } from 'lucide-react';
import { useRaiseHand } from '../hooks/useRaiseHand';

export default function RaiseHand() {
  const { handRaised, lowerHand } = useRaiseHand();

  if (!handRaised) return null;

  return (
    <div className="run-overlay fixed inset-0 z-50 bg-[#061222]/90 backdrop-blur-md flex items-center justify-center">
      <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[34px_38px] text-center max-w-[430px] shadow-2xl">
        <div className="ov-ic w-14 h-14 rounded-2xl bg-[#2f6bff]/20 text-[#7fa6ff] flex items-center justify-center mx-auto mb-4">
          <Monitor className="w-7 h-7" />
        </div>
        <h3 className="font-display text-white text-[21px] font-semibold mb-2">Hand raised — proctoring paused</h3>
        <p className="text-[#b9c9e2] text-[13.5px] leading-relaxed">
          The invigilator has been notified. Answering is paused and detection is suspended until you lower your hand.
        </p>
        <button
          onClick={lowerHand}
          className="btn bg-[#2F6BFF] hover:bg-[#2256d6] text-white w-full justify-center mt-[18px] py-3 rounded-xl font-semibold text-[13.5px]"
        >
          Lower hand &amp; resume
        </button>
      </div>
    </div>
  );
}
