import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Check, Save, ArrowLeft } from 'lucide-react';
import { examService } from '../../services/api';
import Toast from '../../components/common/Toast';

export default function AdminAuthoring() {
  const [searchParams] = useSearchParams();
  const examId = searchParams.get('examId');
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [title, setTitle] = useState('');
  const [stack, setStack] = useState('selenium');
  const [duration, setDuration] = useState(45);
  const [poolSize, setPoolSize] = useState(120);
  const [perAttempt, setPerAttempt] = useState(30);
  const [passMark, setPassMark] = useState(60);

  // New Question form
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQText, setNewQText] = useState('');
  const [newQCode, setNewQCode] = useState('');
  const [newQDifficulty, setNewQDifficulty] = useState('MEDIUM');
  const [newQOptionA, setNewQOptionA] = useState('');
  const [newQOptionB, setNewQOptionB] = useState('');
  const [newQOptionC, setNewQOptionC] = useState('');
  const [newQOptionD, setNewQOptionD] = useState('');
  const [newQCorrect, setNewQCorrect] = useState('A');

  // Toast States
  const [toastShow, setToastShow] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!examId) {
        setLoading(false);
        return;
      }
      try {
        const examRes = await examService.getExamById(examId);
        const qRes = await examService.getQuestions(examId);
        
        const eData = examRes.data;
        setExam(eData);
        setTitle(eData.title);
        setStack(eData.stack);
        setDuration(eData.durationMinutes);
        setPoolSize(eData.questionPool);
        setPerAttempt(eData.perAttempt);
        setPassMark(eData.passMark);
        
        setQuestions(qRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [examId]);

  const handleSaveExam = async () => {
    try {
      const examPayload = {
        id: examId || undefined,
        title,
        stack,
        durationMinutes: parseInt(duration),
        questionPool: parseInt(poolSize),
        perAttempt: parseInt(perAttempt),
        passMark: parseInt(passMark),
        version: exam ? exam.version : 'v1',
        status: exam ? exam.status : 'DRAFT',
        competencyBands: exam ? exam.competencyBands : [
          { levelName: 'L1', title: 'Expert', minScore: 90, maxScore: 100 },
          { levelName: 'L2', title: 'Advanced', minScore: 75, maxScore: 89 },
          { levelName: 'L3', title: 'Intermediate', minScore: 60, maxScore: 74 },
          { levelName: 'L4', title: 'Beginner', minScore: 40, maxScore: 59 },
          { levelName: 'L5', title: 'Needs Training', minScore: 0, maxScore: 39 }
        ]
      };

      const res = await examService.createExam(examPayload);
      if (res.success) {
        setToastMsg('Exam details saved successfully');
        setToastShow(true);
        if (!examId) {
          setTimeout(() => navigate('/admin/exams'), 1200);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!examId) {
      setToastMsg('Please save the exam format before adding questions');
      setToastShow(true);
      return;
    }

    try {
      const payload = {
        questionText: newQText,
        codeSnippet: newQCode || null,
        difficulty: newQDifficulty,
        marks: newQDifficulty === 'HARD' ? 2 : 1,
        correctOption: newQCorrect,
        optionA: newQOptionA,
        optionB: newQOptionB,
        optionC: newQOptionC,
        optionD: newQOptionD,
        isActive: true
      };

      const res = await examService.addQuestion(examId, payload);
      if (res.success) {
        setQuestions([...questions, res.data]);
        setShowAddQuestion(false);
        setNewQText('');
        setNewQCode('');
        setNewQOptionA('');
        setNewQOptionB('');
        setNewQOptionC('');
        setNewQOptionD('');
        setToastMsg('Question added successfully');
        setToastShow(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading authoring editor...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/admin/exams')} className="text-[#5C6B82] hover:text-[#0E1B2E]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="page-head mb-0">
          <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Exam Authoring</span>
          <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1">
            {examId ? `Edit Exam · ${title}` : 'Create New Exam'}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Format properties */}
        <div className="card pad bg-white space-y-4">
          <h3 className="font-display font-semibold text-[15px] text-[#0E1B2E] border-b border-[#EEF2F8] pb-2">Format Properties</h3>
          
          <div className="field">
            <label>Exam title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label>Stack</label>
              <select value={stack} onChange={(e) => setStack(e.target.value)}>
                <option value="selenium">Automation — Selenium</option>
                <option value="api">Quality — API Testing</option>
                <option value="java">Core — Java</option>
                <option value="devops">Platform — DevOps</option>
              </select>
            </div>
            <div className="field">
              <label>Duration (minutes)</label>
              <input type="number" className="mono" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="field">
              <label>Question pool</label>
              <input type="number" className="mono" value={poolSize} onChange={(e) => setPoolSize(e.target.value)} />
            </div>
            <div className="field">
              <label>Per attempt</label>
              <input type="number" className="mono" value={perAttempt} onChange={(e) => setPerAttempt(e.target.value)} />
            </div>
            <div className="field">
              <label>Pass mark %</label>
              <input type="number" className="mono" value={passMark} onChange={(e) => setPassMark(e.target.value)} />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleSaveExam}
              className="btn bg-[#2F6BFF] hover:bg-[#2256d6] text-white flex items-center gap-1.5 px-5 py-2.5 rounded-xl shadow-sm text-sm font-semibold"
            >
              <Save className="w-4 h-4" />
              <span>Save exam format</span>
            </button>
          </div>
        </div>

        {/* Competency Bands */}
        <div className="card pad bg-white flex flex-col justify-between">
          <div>
            <div className="sec-title flex items-center justify-between border-b border-[#EEF2F8] pb-2 mb-3">
              <h3 className="font-display font-semibold text-[15px] text-[#0E1B2E]">Competency Bands</h3>
              <span className="chip ok bg-[#e7f7f0] text-[#0a7a52]">✓ Valid · continuous</span>
            </div>
            <p className="text-[12px] text-[#5C6B82] leading-relaxed mb-4">
              Defines score boundaries mapping to L1-L5. Score ranges must span continuously from 0% to 100%.
            </p>

            <div className="space-y-2.5">
              {[
                { lvl: 'L1', bg: 'var(--t1)', min: 90, max: 100, title: 'Expert' },
                { lvl: 'L2', bg: 'var(--t2)', min: 75, max: 89, title: 'Advanced' },
                { lvl: 'L3', bg: 'var(--t3)', min: 60, max: 74, title: 'Intermediate' },
                { lvl: 'L4', bg: 'var(--t4)', min: 40, max: 59, title: 'Beginner' },
                { lvl: 'L5', bg: 'var(--t5)', min: 0, max: 39, title: 'Needs Training' }
              ].map((b) => (
                <div key={b.lvl} className="band-row flex items-center gap-3.5 p-2 bg-[#F4F7FC] border border-[#E4EAF2] rounded-xl text-sm">
                  <span className="lv w-8 h-[26px] rounded-md text-white font-semibold font-mono text-xs flex items-center justify-center" style={{ backgroundColor: b.bg }}>{b.lvl}</span>
                  <span className="nm font-semibold text-xs text-[#0E1B2E] flex-1">{b.title}</span>
                  <input type="number" readOnly className="mono w-14 text-center border border-[#E4EAF2] bg-white rounded p-0.5" value={b.min} />
                  <span className="text-[#8A99AE]">&ndash;</span>
                  <input type="number" readOnly className="mono w-14 text-center border border-[#E4EAF2] bg-white rounded p-0.5" value={b.max} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Question Bank section */}
      {examId && (
        <div className="card pad bg-white shadow-sm space-y-4">
          <div className="sec-title flex items-center justify-between border-b border-[#EEF2F8] pb-2">
            <h2 className="font-display font-semibold text-base text-[#0E1B2E]">Question Bank</h2>
            <button
              onClick={() => setShowAddQuestion(true)}
              className="btn bg-[#2F6BFF] hover:bg-[#2256d6] text-white flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>
          
          <table className="tbl">
            <thead>
              <tr>
                <th>Question</th>
                <th>Difficulty</th>
                <th>Marks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {questions.length > 0 ? (
                questions.map((q) => (
                  <tr key={q.id}>
                    <td className="text-sm max-w-[420px] truncate">{q.questionText}</td>
                    <td>
                      <span className={`chip text-xs ${q.difficulty === 'HARD' ? 'bg-[#fde8e8] text-[#bb2e2e]' : q.difficulty === 'MEDIUM' ? 'bg-[#fdf3da] text-[#9c7400]' : 'bg-[#e7f7f0] text-[#0a7a52]'}`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="mono font-semibold text-[#0E1B2E]">{q.marks}</td>
                    <td>
                      <span className="chip ok bg-[#e7f7f0] text-[#0a7a52]">Active</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-[#5C6B82]">No questions in pool yet. Click "Add Question" to begin.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddQuestion && (
        <div className="fixed inset-0 z-50 bg-[#0b1f38]/60 backdrop-blur-[3px] flex items-center justify-center p-5">
          <form onSubmit={handleAddQuestionSubmit} className="bg-white rounded-2xl max-w-[540px] w-full p-[26px] shadow-2xl text-[#0E1B2E] space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-lg font-bold">Add Question to Pool</h3>
            
            <div className="field">
              <label>Question Text</label>
              <textarea required rows={2} value={newQText} onChange={(e) => setNewQText(e.target.value)} />
            </div>

            <div className="field">
              <label>Code Snippet (Optional)</label>
              <textarea rows={3} className="mono" value={newQCode} onChange={(e) => setNewQCode(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label>Difficulty</label>
                <select value={newQDifficulty} onChange={(e) => setNewQDifficulty(e.target.value)}>
                  <option value="EASY">Easy (1 mark)</option>
                  <option value="MEDIUM">Medium (1 mark)</option>
                  <option value="HARD">Hard (2 marks)</option>
                </select>
              </div>
              <div className="field">
                <label>Correct Option</label>
                <select value={newQCorrect} onChange={(e) => setNewQCorrect(e.target.value)}>
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[12.5px] font-semibold block text-[#0E1B2E]">Options</label>
              <input required type="text" placeholder="Option A" value={newQOptionA} onChange={(e) => setNewQOptionA(e.target.value)} className="w-full text-sm border rounded-lg p-2 bg-white" />
              <input required type="text" placeholder="Option B" value={newQOptionB} onChange={(e) => setNewQOptionB(e.target.value)} className="w-full text-sm border rounded-lg p-2 bg-white" />
              <input required type="text" placeholder="Option C" value={newQOptionC} onChange={(e) => setNewQOptionC(e.target.value)} className="w-full text-sm border rounded-lg p-2 bg-white" />
              <input required type="text" placeholder="Option D" value={newQOptionD} onChange={(e) => setNewQOptionD(e.target.value)} className="w-full text-sm border rounded-lg p-2 bg-white" />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-sm font-semibold"
                onClick={() => setShowAddQuestion(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#2F6BFF] hover:bg-[#2256d6] text-white rounded-xl text-sm font-semibold"
              >
                Add Question
              </button>
            </div>
          </form>
        </div>
      )}

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />
    </div>
  );
}
