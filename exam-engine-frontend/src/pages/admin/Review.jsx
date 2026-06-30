import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Play, Check, ShieldAlert, Award, FileText, Camera } from 'lucide-react';
import { attemptService } from '../../services/api';
import FourEyesModal from '../../components/common/FourEyesModal';
import Toast from '../../components/common/Toast';

export default function AdminReview() {
  const [searchParams] = useSearchParams();
  const attemptIdParam = searchParams.get('attemptId');

  const [attempts, setAttempts] = useState([]);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Escalate / Toast States
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [toastShow, setToastShow] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    async function loadAttempts() {
      try {
        const attemptsRes = await attemptService.getAllAttempts();
        const allAttempts = attemptsRes.data || [];
        setAttempts(allAttempts);

        let targetId = attemptIdParam;
        if (!targetId && allAttempts.length > 0) {
          targetId = allAttempts[0].id;
        }

        if (targetId) {
          const detailRes = await attemptService.getAttemptDetail(targetId);
          setActiveAttempt(detailRes.data.attempt);
          setViolations(detailRes.data.violations || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempts();
  }, [attemptIdParam]);

  const handleConfirmResult = () => {
    setToastMsg('Result confirmed and logged to audit trail');
    setToastShow(true);
  };

  const handleEscalateConfirm = () => {
    setShowEscalateModal(false);
    setToastMsg('Escalation sent · awaiting second approver');
    setToastShow(true);
  };

  if (loading) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading review detail...</div>;
  }

  if (!activeAttempt) {
    return (
      <div className="card pad text-center text-[#5C6B82] py-12">
        No proctored attempts logged for review.
      </div>
    );
  }

  const getTierColor = (lvl) => {
    const colors = {
      L1: 'bg-[#0E9F6E]',
      L2: 'bg-[#57B85A]',
      L3: 'bg-[#E0A500]',
      L4: 'bg-[#EA7A3B]',
      L5: 'bg-[#E04F4F]'
    };
    return colors[lvl] || 'bg-slate-500';
  };

  return (
    <div>
      <div className="page-head mb-[22px]">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">
          Integrity review &middot; Attempt #{activeAttempt.id?.substring(0, 8).toUpperCase()}
        </span>
        <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1">
          {activeAttempt.candidate?.fullName} &mdash; {activeAttempt.exam?.title}
        </h1>
        <p className="text-[#5C6B82] text-sm">
          Review the AI flags and window hide timestamps against the recording before deciding. AI events are advisory.
        </p>
      </div>

      <div className="note amber bg-[#fdf6e7] border border-[#f4e3bd] text-[#7a5a12] rounded-xl p-4 flex gap-3 mb-[18px] text-[13.5px] leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-[#c9831a] shrink-0 mt-0.5" />
        <div>
          This recording and snapshot stream contains personal candidate data. Your access is being logged to the security audit trail. Use it only for assessment review.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-5 items-start">
        {/* Left Column: Player & Stats */}
        <div>
          <div className="player aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-t from-[#091a30] to-[#1c3c66] flex items-center justify-center relative shadow-lg">
            <div className="rec absolute top-3.5 left-3.5 flex items-center gap-1.5 bg-black/60 text-white font-mono text-[11px] px-2.5 py-1.5 rounded-full">
              <i className="w-2 h-2 rounded-full bg-[#E04F4F]" />
              <span>REC &middot; 38:14 / 45:00</span>
            </div>
            
            <div className="silhouette text-[#7fa6e6] bg-white/10 w-28 h-28 rounded-full flex items-center justify-center">
              <Camera className="w-14 h-14" />
            </div>

            <div className="ctrlbar absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex items-center gap-3">
              <button className="play w-[34px] h-[34px] rounded-lg bg-white/20 text-white flex items-center justify-center">
                <Play className="w-4.5 h-4.5 fill-current" />
              </button>
              <div className="scrub flex-1 h-2 bg-white/25 rounded-full relative">
                <div className="prog absolute top-0 bottom-0 left-0 bg-[#2F6BFF] rounded-full w-[42%]" />
                <span className="mk absolute top-[-3px] w-[3px] h-3.5 bg-[#F2A93B] rounded-sm" style={{ left: '18%' }} />
                <span className="mk absolute top-[-3px] w-[3px] h-3.5 bg-[#F2A93B] rounded-sm" style={{ left: '36%' }} />
              </div>
              <span className="t text-xs font-mono text-[#cdddf6]">38:14</span>
            </div>
          </div>

          <div className="card pad bg-white shadow-sm mt-4">
            <div className="sec-title flex items-center justify-between mb-3 border-b border-[#EEF2F8] pb-2">
              <h2 className="font-display font-semibold text-sm text-[#0E1B2E]">Score &amp; assigned level</h2>
              <span className="chip mute bg-[#eef2f8] text-[#5C6B82]">Admin-only</span>
            </div>
            
            <div className="flex gap-5 flex-wrap items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-3xl font-bold text-[#0E1B2E]">{activeAttempt.score ?? 0}</span>
                <small className="text-sm text-[#5C6B82] font-semibold">% Score</small>
              </div>
              
              <span className={`tier-badge flex items-center gap-2 font-bold font-display text-[13px] px-3.5 py-1.5 rounded-full text-white ${getTierColor(activeAttempt.assignedLevel)}`}>
                <i>{activeAttempt.assignedLevel}</i>
                <span className="text-[11.5px] font-medium uppercase">{activeAttempt.assignedLevel === 'L1' ? 'Expert' : 'Assigned Level'}</span>
              </span>
              
              <div className="text-xs text-[#5C6B82]">
                Pass threshold {activeAttempt.exam?.passMark}% &middot; {activeAttempt.exam?.perAttempt} pool questions
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Violation Timeline */}
        <div className="space-y-4">
          <div className="card pad bg-white shadow-sm">
            <div className="sec-title flex items-center justify-between mb-3 border-b border-[#EEF2F8] pb-2">
              <h2 className="font-display font-semibold text-sm text-[#0E1B2E]">Integrity timeline</h2>
              <span className="chip mute bg-[#eef2f8] text-[#5C6B82] font-semibold">{violations.length} flags</span>
            </div>

            <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
              {violations.length > 0 ? (
                violations.map((vio) => (
                  <div key={vio.id} className="vio-item flex gap-3 border-b border-[#EEF2F8] pb-3 last:border-none last:pb-0">
                    <div className="snap w-[54px] h-[42px] rounded-lg shrink-0 overflow-hidden relative border border-[#E4EAF2] flex items-center justify-center bg-gradient-to-t from-[#0b2038] to-[#1c3c66] text-[#7fa6e6]">
                      {vio.snapshotUrl ? (
                        <img 
                          src={vio.snapshotUrl.startsWith('/uploads') ? `http://localhost:8080${vio.snapshotUrl}` : vio.snapshotUrl} 
                          alt="Webcam Alert" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Camera className="w-[18px] h-[18px] text-[#7fa6e6]" />
                      )}
                      <span className="absolute bottom-0 left-0 right-0 text-[7px] text-center font-mono bg-black/50 text-[#cfe] py-0.5">160x120</span>
                    </div>
                    
                    <div className="flex-1">
                      <b className="font-semibold text-[13px] text-[#0E1B2E] block">{vio.violationCode}</b>
                      <p className="text-[11.5px] text-[#5C6B82] leading-tight mt-0.5">{vio.metaDescription}</p>
                    </div>
                    <span className="ts font-mono text-[11.5px] text-[#5C6B82] ml-auto">{vio.timestampOffset}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-[#8A99AE]">No violations recorded. Clean session.</div>
              )}
            </div>
          </div>

          {/* Decision card */}
          <div className="card pad bg-white shadow-sm space-y-3">
            <h2 className="font-display font-semibold text-sm text-[#0E1B2E]">Decision</h2>
            <p className="text-[12.5px] text-[#5C6B82] leading-relaxed">
              Flags are advisory. Confirm the result stands, or escalate for secondary reviewer validation.
            </p>
            <button
              onClick={handleConfirmResult}
              className="btn bg-[#2F6BFF] hover:bg-[#2256d6] text-white w-full justify-center py-2.5 rounded-xl font-semibold text-[13.5px] shadow-sm transition-all"
            >
              Confirm result stands
            </button>
            <button
              onClick={() => setShowEscalateModal(true)}
              className="btn ghost w-full justify-center py-2.5 rounded-xl font-semibold text-[13.5px] transition-all"
            >
              Escalate for second review
            </button>
          </div>
        </div>
      </div>

      {/* Escalation Modal */}
      <FourEyesModal
        show={showEscalateModal}
        title="Second approver required"
        description="Escalating this review is a sensitive action. It will be sent to another administrator to approve, and both of you will appear in the security audit log."
        confirmText="Request escalation"
        onConfirm={handleEscalateConfirm}
        onCancel={() => setShowEscalateModal(false)}
      />

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />
    </div>
  );
}
