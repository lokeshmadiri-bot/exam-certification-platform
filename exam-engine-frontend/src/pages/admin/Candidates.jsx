import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import FourEyesModal from '../../components/common/FourEyesModal';
import Toast from '../../components/common/Toast';

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  // Toast states
  const [toastShow, setToastShow] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    async function loadCandidates() {
      try {
        const res = await adminService.getCandidates();
        setCandidates(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCandidates();
  }, []);

  const handleOverrideTrigger = (cand) => {
    setSelectedCandidate(cand);
    setShowOverrideModal(true);
  };

  const handleOverrideConfirm = async () => {
    setShowOverrideModal(false);
    if (!selectedCandidate) return;
    try {
      const res = await adminService.approveOverride(selectedCandidate.id);
      if (res.success) {
        setToastMsg(`Override approved for ${selectedCandidate.fullName}`);
        setToastShow(true);
        // Refresh list
        const refreshed = await adminService.getCandidates();
        setCandidates(refreshed.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading candidates...</div>;
  }

  return (
    <div>
      <div className="page-head mb-[22px]">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">People</span>
        <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1">Candidates</h1>
        <p className="text-[#5C6B82] text-sm">
          Everyone eligible for certification, their highest level per stack, and attempt lock statuses.
        </p>
      </div>

      <div className="card pad">
        <table className="tbl">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Primary stack</th>
              <th>Highest Level</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {candidates.length > 0 ? (
              candidates.map((cand) => (
                <tr key={cand.id}>
                  <td>
                    <div className="who flex items-center gap-2.5">
                      <div className="av w-[34px] h-[34px] rounded-lg bg-[#eaf1ff] text-[#2F6BFF] flex items-center justify-center font-semibold text-xs shrink-0 uppercase">
                        {cand.fullName?.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <b className="font-semibold text-sm text-[#0E1B2E]">{cand.fullName}</b>
                        <span className="text-[11.5px] text-[#5C6B82] block">{cand.title || 'Engineer'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm">Quality Engineering</td>
                  <td>
                    <span className="tier-badge bg-[#E0A500] font-bold font-display text-[12px] px-2.5 py-0.5 rounded-full text-white">
                      <i>L2</i>
                    </span>
                  </td>
                  <td>
                    <span className="chip ok bg-[#e7f7f0] text-[#0a7a52]">Available</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleOverrideTrigger(cand)}
                      className="linkish hover:underline text-xs"
                    >
                      Override lock
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-8 text-[#5C6B82]">
                  No candidates listed in system.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <FourEyesModal
        show={showOverrideModal}
        title={`Override retry lock for ${selectedCandidate?.fullName}`}
        description="This action overrides the 30-day cool down retry lock. It requires a second approver and is recorded directly in the security audit logs."
        confirmText="Approve override"
        onConfirm={handleOverrideConfirm}
        onCancel={() => setShowOverrideModal(false)}
      />

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />
    </div>
  );
}
