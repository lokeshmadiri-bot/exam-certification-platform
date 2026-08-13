import React from 'react';
import { HelpCircle, AlertTriangle, ShieldCheck, RefreshCw, MessageSquare } from 'lucide-react';

export default function CandidateHelp() {
  return (
    <div>
      <div className="page-head mb-[22px]">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Rules &amp; guidelines</span>
        <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1">Exam Rules &amp; Help</h1>
        <p className="text-[#5C6B82] text-sm">
          Please review the following rules to ensure a seamless certification experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card pad space-y-4">
          <div className="flex items-center gap-3 border-b border-[#EEF2F8] pb-3">
            <ShieldCheck className="w-6 h-6 text-[#2F6BFF]" />
            <h3 className="font-display font-semibold text-[17px] text-[#0E1B2E]">Proctoring Standards</h3>
          </div>
          <div className="space-y-3 text-[13.5px] text-[#5C6B82] leading-relaxed">
            <p>
              <b>Active Camera Feed:</b> You must sit directly in front of your camera. Maintain a clear face visualization. Backlighting or side lighting may trigger flags.
            </p>
            <p>
              <b>Audio Integrity:</b> A quiet environment is required. Consistent background sound or external dialogue is flagged.
            </p>
            <p>
              <b>Tab Constraints:</b> Leaving the exam fullscreen mode or switching browser tabs increments your strike count. 3 strikes will terminate the exam.
            </p>
          </div>
        </div>

        <div className="card pad space-y-4">
          <div className="flex items-center gap-3 border-b border-[#EEF2F8] pb-3">
            <AlertTriangle className="w-6 h-6 text-[#F2A93B]" />
            <h3 className="font-display font-semibold text-[17px] text-[#0E1B2E]">Critical Actions</h3>
          </div>
          <div className="space-y-3 text-[13.5px] text-[#5C6B82] leading-relaxed">
            <p>
              <b>Page Reloading:</b> Do NOT refresh the browser page. Refreshing submits the current progress and closes the session.
            </p>
            <p>
              <b>Back Button:</b> Navigating backwards terminates your session.
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
