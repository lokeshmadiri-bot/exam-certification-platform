import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { ShieldCheck, Info, FileText } from 'lucide-react';

export default function AdminSettings() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await adminService.getAuditLogs();
        setLogs(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  if (loading) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading governance settings...</div>;
  }

  return (
    <div>
      <div className="page-head mb-[22px]">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Governance &amp; retention</span>
        <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1">Integrity Controls</h1>
        <p className="text-[#5C6B82] text-sm">
          Adjust proctoring calibration threshold and review administrator action records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        {/* Settings options */}
        <div className="space-y-4">
          <div className="card pad bg-white space-y-4">
            <h3 className="font-display font-semibold text-[15px] text-[#0E1B2E] border-b border-[#EEF2F8] pb-2">Recording &amp; Privacy</h3>
            
            <div className="field">
              <label>Retention Period</label>
              <select defaultValue="90">
                <option value="90">90 days (Recommended)</option>
                <option value="60">60 days</option>
                <option value="30">30 days</option>
              </select>
              <div className="hint text-[11.5px] text-[#8A99AE] mt-1.5 leading-snug">
                Proctoring webcam and screen snapshots are permanently purged after this duration.
              </div>
            </div>

            <div className="switch flex items-center justify-between p-3.5 border border-[#E4EAF2] rounded-xl bg-white">
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E] block">Encrypt snapshots at rest</b>
                <span className="text-[12px] text-[#5C6B82] block mt-0.5">AES-256 local/S3 encryption</span>
              </div>
              <span className="toggle shrink-0 w-11 h-[25px] rounded-full relative bg-[#2F6BFF]">
                <i className="absolute top-0.5 left-[18px] w-[21px] h-[21px] rounded-full bg-white" />
              </span>
            </div>

            <div className="switch flex items-center justify-between p-3.5 border border-[#E4EAF2] rounded-xl bg-white">
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E] block">Watermark exam runner</b>
                <span className="text-[12px] text-[#5C6B82] block mt-0.5">Time + candidate ID overlay</span>
              </div>
              <span className="toggle shrink-0 w-11 h-[25px] rounded-full relative bg-[#2F6BFF]">
                <i className="absolute top-0.5 left-[18px] w-[21px] h-[21px] rounded-full bg-white" />
              </span>
            </div>
          </div>

          <div className="card pad bg-white space-y-4">
            <h3 className="font-display font-semibold text-[15px] text-[#0E1B2E] border-b border-[#EEF2F8] pb-2">AI Proctored Calibration</h3>
            
            <div className="field">
              <label>Sensitivity Calibration</label>
              <select defaultValue="balanced">
                <option value="lenient">Lenient (fewer warning logs)</option>
                <option value="balanced">Balanced (recommended)</option>
                <option value="strict">Strict (high verification triggers)</option>
              </select>
            </div>

            <div className="params grid grid-cols-2 gap-2 mt-4 text-[12.5px] text-[#5C6B82]">
              <div className="prm p-2 bg-[#F4F7FC] border border-[#EEF2F8] rounded-xl flex justify-between">
                <span>Yaw (looking away)</span> <b className="font-mono text-[#0E1B2E] font-semibold">35&deg;</b>
              </div>
              <div className="prm p-2 bg-[#F4F7FC] border border-[#EEF2F8] rounded-xl flex justify-between">
                <span>Detection Interval</span> <b className="font-mono text-[#0E1B2E] font-semibold">3 s</b>
              </div>
              <div className="prm p-2 bg-[#F4F7FC] border border-[#EEF2F8] rounded-xl flex justify-between">
                <span>Strike Limit</span> <b className="font-mono text-[#0E1B2E] font-semibold">3 warnings</b>
              </div>
              <div className="prm p-2 bg-[#F4F7FC] border border-[#EEF2F8] rounded-xl flex justify-between">
                <span>Snapshot size</span> <b className="font-mono text-[#0E1B2E] font-semibold">160x120</b>
              </div>
            </div>
          </div>
        </div>

        {/* Audit logs table */}
        <div className="space-y-4">
          <div className="note brand bg-[#eef4ff] border border-[#d7e4ff] text-[#23457e] rounded-xl p-4 flex gap-3 text-[13.5px] leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-[#2F6BFF] shrink-0 mt-0.5" />
            <div>
              <b className="font-display font-bold block mb-1">Two-person rule active.</b>
              Changing critical S3 buckets or approving retry lock overrides requires dual-review audits and logs.
            </div>
          </div>

          <div className="card pad bg-white shadow-sm flex flex-col">
            <div className="sec-title flex items-center justify-between border-b border-[#EEF2F8] pb-2 mb-3">
              <h3 className="font-display font-semibold text-[15px] text-[#0E1B2E] flex items-center gap-1.5">
                <FileText className="w-4.5 h-4.5 text-[#2F6BFF]" />
                <span>Security Audit Log</span>
              </h3>
              <span className="chip mute bg-[#eef2f8] text-[#5C6B82] font-semibold">Read-only</span>
            </div>

            <div className="max-h-[380px] overflow-y-auto pr-1">
              <table className="tbl text-xs">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>By User</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 text-[#0E1B2E]">{log.action}</td>
                        <td className="py-2.5 font-semibold">{log.user?.fullName}</td>
                        <td className="py-2.5 mono text-[#5C6B82]">{new Date(log.createdAt).toLocaleTimeString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center py-6 text-[#5C6B82]">No security logs recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
