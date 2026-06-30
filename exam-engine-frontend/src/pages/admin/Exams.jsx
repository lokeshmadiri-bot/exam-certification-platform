import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import { examService } from '../../services/api';
import FourEyesModal from '../../components/common/FourEyesModal';
import Toast from '../../components/common/Toast';

export default function AdminExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status toggle states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  // Toast states
  const [toastShow, setToastShow] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    async function loadExams() {
      try {
        const res = await examService.getAllExams();
        setExams(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadExams();
  }, []);

  const handleStatusToggleTrigger = (exam) => {
    setSelectedExam(exam);
    setShowStatusModal(true);
  };

  const handleStatusConfirm = async () => {
    setShowStatusModal(false);
    if (!selectedExam) return;

    const newStatus = selectedExam.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    try {
      const res = await examService.updateStatus(selectedExam.id, newStatus);
      if (res.success) {
        setToastMsg(`${selectedExam.title} is now ${newStatus === 'ACTIVE' ? 'Active' : 'Draft'}`);
        setToastShow(true);
        // Refresh list
        const refreshed = await examService.getAllExams();
        setExams(refreshed.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading exams library...</div>;
  }

  return (
    <div>
      <div className="page-head flex items-center justify-between flex-wrap gap-4 mb-[22px]">
        <div>
          <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Catalogue</span>
          <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1">Exams Library</h1>
          <p className="text-[#5C6B82] text-sm">
            Create or edit active certifications, duration metrics, and pass criteria.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/authoring')}
          className="btn bg-[#2F6BFF] hover:bg-[#2256d6] text-white flex items-center gap-1.5 px-[18px] py-[11px] rounded-xl shadow-md transition-all text-[13.5px] font-semibold"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Create Exam</span>
        </button>
      </div>

      <div className="exam-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map((exam) => {
          const style = getStackIcon(exam.stack);
          const active = exam.status === 'ACTIVE';

          return (
            <div key={exam.id} className="exam-card bg-white border border-[#E4EAF2] rounded-2xl p-[18px] shadow-sm flex flex-col">
              <div className="top flex items-center gap-3 mb-3.5">
                <div className="ic w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: style.bg, color: style.fg }}>
                  <Award className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-[15.5px] text-[#0E1B2E]">{exam.title}</h3>
                  <div className="sub text-[11.5px] text-[#5C6B82] capitalize">{exam.stack} &middot; {exam.version}</div>
                </div>
              </div>
              
              <div className="facts flex gap-4 my-4 text-xs text-[#5C6B82] border-b border-[#EEF2F8] pb-3">
                <span>Questions <b className="text-[#0E1B2E] font-mono font-semibold">{exam.perAttempt}</b></span>
                <span>Pass mark <b className="text-[#0E1B2E] font-mono font-semibold">{exam.passMark}%</b></span>
              </div>

              <div className="foot mt-auto flex items-center justify-between">
                <span className={`chip ${active ? 'bg-[#e7f7f0] text-[#0a7a52]' : 'bg-[#eef2f8] text-[#5C6B82]'}`}>
                  {exam.status}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/admin/authoring?examId=${exam.id}`)}
                    className="px-3 py-1.5 border border-[#E4EAF2] hover:bg-[#F4F7FC] rounded-lg text-xs font-semibold text-[#0E1B2E]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleStatusToggleTrigger(exam)}
                    className="px-3 py-1.5 border border-[#E4EAF2] hover:bg-[#F4F7FC] rounded-lg text-xs font-semibold text-[#0E1B2E]"
                  >
                    {active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <FourEyesModal
        show={showStatusModal}
        title={`${selectedExam?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${selectedExam?.title}?`}
        description="Altering an exam's publication state restricts candidate access. A secondary administrator must confirm this change."
        confirmText="Confirm state change"
        onConfirm={handleStatusConfirm}
        onCancel={() => setShowStatusModal(false)}
      />

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />
    </div>
  );
}
