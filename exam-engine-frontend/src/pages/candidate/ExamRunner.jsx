import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Monitor, AlertTriangle, Play, HelpCircle, Check, Loader } from 'lucide-react';
import { attemptService } from '../../services/api';
import Toast from '../../components/common/Toast';

export default function ExamRunner() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // questionId -> chosenOption

  // Timer & Status
  const [timeRemaining, setTimeRemaining] = useState(41 * 60 + 12); // seconds
  const [strikes, setStrikes] = useState(0);
  const [offline, setOffline] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [raiseCount, setRaiseCount] = useState(0);
  const [warningToast, setWarningToast] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  // References
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const runnerRef = useRef(null);

  // Initialize and load attempt data
  useEffect(() => {
    async function loadAttempt() {
      try {
        const res = await attemptService.getAttemptDetail(attemptId);
        // Note: Detail endpoint returns { attempt, violations }
        // To get active questions, let's start or load standard questions
        // In startAttempt we got questions, let's recover them or fetch them
        // Let's assume start attempt stored questions or we pull them from attempt info
        // Let's fallback to standard template if API fails, but make it fit the API return
        const attemptObj = res.data.attempt;
        const examObj = attemptObj.exam;

        // Since getAttemptDetail returns attempt summary, let's load active questions
        // We will fetch questions using attempt details
        const questionsRes = await attemptService.startAttempt(examObj.id);
        setQuestions(questionsRes.data.questions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId]);

  // Webcam Capture
  useEffect(() => {
    async function captureCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120 } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera capture failed', err);
      }
    }
    if (!loading) captureCam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [loading]);

  // Request Fullscreen on launch
  useEffect(() => {
    if (!loading && runnerRef.current) {
      if (runnerRef.current.requestFullscreen) {
        runnerRef.current.requestFullscreen().catch(() => { });
      }
    }
  }, [loading]);

  // Timer countdown
  useEffect(() => {
    if (loading || handRaised || offline) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowTimeUp(true);
          setTimeout(() => handleGradingSubmit(), 1800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, handRaised, offline]);

  // Window Listeners (Visibility change, resize, online/offline state)
  useEffect(() => {
    if (loading) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleStrikeTrigger("TAB_SWITCH", "Window hidden / tab switched");
      }
    };

    const handleResize = () => {
      handleStrikeTrigger("WINDOW_RESIZE", "Window size altered");
    };

    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [loading, strikes]);

  // Capture webcam frame as a Blob to upload to backend as a violation snapshot
  const captureSnapshotBlob = async () => {
    return new Promise((resolve) => {
      if (!videoRef.current) {
        resolve(null);
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 160, 120);
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg');
      } catch (err) {
        console.error('Canvas capture failed', err);
        resolve(null);
      }
    });
  };

  const handleStrikeTrigger = async (code, meta) => {
    if (handRaised || offline) return;
    const formatTime = formatTimeRemaining(timeRemaining);

    // Capture snapshot from webcam
    const blob = await captureSnapshotBlob();
    const imageFile = blob ? new File([blob], 'snapshot.jpg', { type: 'image/jpeg' }) : null;

    try {
      const res = await attemptService.recordTabSwitch(attemptId, formatTime);

      // Upload webcam snapshot associated with violation
      await attemptService.recordViolation(attemptId, code, meta, formatTime, imageFile);

      if (res.data.terminated) {
        // Stop camera tracks and exit fullscreen
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        try { if (document.exitFullscreen) document.exitFullscreen(); } catch (_) { }
        navigate('/candidate/terminated');
      } else {
        setStrikes(res.data.strikes);
        setWarningToast(`Warning ${res.data.strikes} of 3 — stay on the exam tab`);
        setTimeout(() => setWarningToast(''), 4200);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRaiseHand = () => {
    if (raiseCount >= 5) {
      setToastMsg('Raise-hand limit reached (5 of 5)');
      setToastShow(true);
      return;
    }
    setRaiseCount((prev) => prev + 1);
    setHandRaised(true);
  };

  const handleLowerHand = () => {
    setHandRaised(false);
    setToastMsg('Resumed · proctoring active');
    setToastShow(true);
  };

  const selectOption = (opt) => {
    const qId = questions[currentIdx].id;
    setSelectedAnswers({
      ...selectedAnswers,
      [qId]: opt
    });
  };

  const formatTimeRemaining = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleGradingSubmit = async () => {
    setShowConfirmSubmit(false);
    setShowThanks(true);

    // Assemble submissions array
    const submissions = Object.keys(selectedAnswers).map(qId => ({
      questionId: qId,
      selectedOption: selectedAnswers[qId]
    }));

    try {
      const res = await attemptService.submitAttempt(attemptId, submissions);
      if (res.success) {
        // Stop stream and fullscreen
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        try { if (document.exitFullscreen) document.exitFullscreen(); } catch (_) { }
        setTimeout(() => {
          navigate(`/candidate/result-view/${attemptId}`);
        }, 1700);
      }
    } catch (err) {
      console.error('Failed to submit attempt:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-20 font-mono text-sm text-white bg-[#081627] min-h-screen flex items-center justify-center gap-2">
      <Loader className="w-5 h-5 animate-spin" />
      <span>Loading proctored exam runner...</span>
    </div>;
  }

  const currentQuestion = questions[currentIdx];

  return (
    <div ref={runnerRef} className="runner fixed inset-0 z-50 bg-gradient-to-br from-[#081627] to-[#102a4d] text-[#e8eefb] flex flex-col overflow-hidden select-none">
      {/* Watermark */}
      <div className="wm-text absolute inset-0 pointer-events-none text-white/5 font-mono text-xs select-none rotate-[-20deg] scale-[1.4] origin-center leading-[120px] whitespace-nowrap overflow-hidden">
        {Array(60).fill("AARAV MEHTA · PROCTORED SESSION · ORYFOLKS CERTIFY ").join("")}
      </div>

      {/* Warnings / Modals */}
      {warningToast && (
        <div className="warn-toast fixed top-[78px] left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-[#3a2410] border border-[#F2A93B] text-[#ffd79a] px-[18px] py-3 rounded-xl shadow-2xl animate-[drop_0.3s_ease] max-w-[560px]">
          <AlertTriangle className="w-5 h-5 text-[#F2A93B]" />
          <div>
            <b className="text-white text-[13.5px] block">{warningToast}</b>
            <span className="text-[12px] block">Leaving the exam tab again will lead to automatic termination.</span>
          </div>
        </div>
      )}

      {/* Offline Overlay */}
      {offline && (
        <div className="run-overlay fixed inset-0 z-50 bg-[#061222]/90 backdrop-blur-md flex items-center justify-center">
          <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[34px_38px] text-center max-w-[430px] shadow-2xl">
            <div className="ov-spin w-11 h-11 border-[3.5px] border-white/10 border-t-[#F2A93B] rounded-full animate-spin mx-auto mb-4" />
            <h3 className="font-display text-white text-[21px] font-semibold mb-2">Connection lost — reconnecting</h3>
            <p className="text-[#b9c9e2] text-[13.5px] leading-relaxed">
              Your answers are saved automatically. The timer keeps running, so stay on this screen — we'll restore your exam the moment you're back online.
            </p>
          </div>
        </div>
      )}

      {/* Hand Raised Overlay */}
      {handRaised && (
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
              onClick={handleLowerHand}
              className="btn bg-[#2F6BFF] hover:bg-[#2256d6] text-white w-full justify-center mt-[18px] py-3 rounded-xl font-semibold text-[13.5px]"
            >
              Lower hand &amp; resume
            </button>
          </div>
        </div>
      )}

      {/* Time's Up Overlay */}
      {showTimeUp && (
        <div className="run-overlay fixed inset-0 z-50 bg-[#061222]/90 backdrop-blur-md flex items-center justify-center">
          <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[34px_38px] text-center max-w-[430px] shadow-2xl">
            <h3 className="font-display text-white text-[21px] font-semibold mb-2">Time's up</h3>
            <p className="text-[#b9c9e2] text-[13.5px]">Submitting the answers you've completed. Please wait…</p>
          </div>
        </div>
      )}

      {/* Thanks Overlay */}
      {showThanks && (
        <div className="run-overlay fixed inset-0 z-50 bg-[#061222]/90 backdrop-blur-md flex items-center justify-center">
          <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[34px_38px] text-center max-w-[430px] shadow-2xl">
            <div className="ov-ic w-14 h-14 rounded-2xl bg-[#0e9f6e]/20 text-[#34d27b] flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="font-display text-white text-[21px] font-semibold mb-2">Submission received</h3>
            <p className="text-[#b9c9e2] text-[13.5px]">Thank you. Your answers have been recorded and are being scored. Your result will appear in a moment…</p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="run-top flex items-center justify-between px-6 py-4 border-b border-white/10 z-10 bg-[#081627]">
        <div className="x flex items-center gap-3">
          <div className="glyph w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-[#2F6BFF] to-[#5b8cff] flex items-center justify-center shrink-0">
            <Monitor className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <b className="font-display text-sm font-semibold text-white">Selenium Certification</b>
            <span className="text-[11px] text-[#8fa9d0] font-mono block">ATTEMPT #{attemptId?.substring(0, 8).toUpperCase()} · 30 QUESTIONS</span>
          </div>
        </div>

        <div className="flex items-center gap-5 ml-auto">
          <div className="run-strikes flex items-center gap-1.5 text-xs text-[#c7d6ee]" title="Tab switch warnings">
            <span>Strikes</span>
            <span className={`s w-2.5 h-2.5 rounded-full border border-white/25 ${strikes >= 1 ? 'used bg-[#F2A93B] border-none' : 'bg-white/10'}`} />
            <span className={`s w-2.5 h-2.5 rounded-full border border-white/25 ${strikes >= 2 ? 'used bg-[#F2A93B] border-none' : 'bg-white/10'}`} />
            <span className={`s w-2.5 h-2.5 rounded-full border border-white/25 ${strikes >= 3 ? 'used bg-[#F2A93B] border-none' : 'bg-white/10'}`} />
          </div>
          <div className="run-integrity flex items-center gap-2 bg-[#11371f] border border-[#1d5e34] text-[#9fc4a8] text-xs px-3.5 py-1.5 rounded-full font-medium">
            <i className="w-2 h-2 rounded-full bg-[#34d27b] shadow-[0_0_0_4px_rgba(52,210,123,0.13)]" />
            <span>Proctoring active · recording</span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="run-body flex-1 grid grid-cols-1 lg:grid-cols-[1fr_330px] overflow-hidden">
        <div className="run-main p-[30px_38px] overflow-y-auto">
          {questions.length > 0 && currentQuestion ? (
            <div className="run-q max-w-[760px] mx-auto">
              {/* Stepper progress */}
              <div className="qmeta flex items-center gap-3 text-[#8fa9d0] text-[12.5px] font-mono mb-4">
                <span>Q {String(currentIdx + 1).padStart(2, '0')} / {questions.length}</span>
                <div className="bar flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <i className="block h-full bg-gradient-to-r from-[#2F6BFF] to-[#6e9bff] transition-all" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
                </div>
                <span className="savechip flex items-center gap-1.5 text-[#86e0b4]"><i className="w-1.5 h-1.5 rounded-full bg-[#34d27b] animate-pulse" /> Saved</span>
              </div>

              <h2 className="font-display font-semibold text-[23px] text-white leading-snug mb-2">{currentQuestion.questionText}</h2>

              {currentQuestion.codeSnippet && (
                <div className="code font-mono text-[13px] bg-[#0c2138] border border-white/10 rounded-lg p-[13px_15px] text-[#bcd0ee] my-[14px] whitespace-pre">
                  {currentQuestion.codeSnippet}
                </div>
              )}

              <div className="opts flex flex-col gap-3 mt-6">
                {[
                  { key: 'A', text: currentQuestion.optionA },
                  { key: 'B', text: currentQuestion.optionB },
                  { key: 'C', text: currentQuestion.optionC },
                  { key: 'D', text: currentQuestion.optionD }
                ].map((opt) => (
                  <div
                    key={opt.key}
                    onClick={() => selectOption(opt.key)}
                    className={`opt flex items-center gap-3.5 p-[16px_18px] border-[1.5px] rounded-xl bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer ${selectedAnswers[currentQuestion.id] === opt.key ? 'sel border-[#2F6BFF] bg-[#2f6bff]/10 shadow-[0_0_0_3px_rgba(47,107,255,0.13)]' : 'border-white/10'
                      }`}
                  >
                    <span className={`k w-[30px] h-[30px] rounded-lg font-mono text-[13px] flex items-center justify-center shrink-0 ${selectedAnswers[currentQuestion.id] === opt.key ? 'bg-[#2F6BFF] text-white' : 'bg-white/10 text-[#cdddf6]'
                      }`}>{opt.key}</span>
                    <p className="text-[14.5px] text-[#e3ebf8]">{opt.text}</p>
                  </div>
                ))}
              </div>

              {/* Navigation Footer */}
              <div className="run-foot flex items-center justify-between max-w-[760px] mt-[28px] mx-auto">
                <button
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx(currentIdx - 1)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-[#cdddf6] hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[13.5px] transition-all"
                >
                  &larr; Previous
                </button>
                <button
                  disabled={currentIdx === questions.length - 1}
                  onClick={() => setCurrentIdx(currentIdx + 1)}
                  className="px-5 py-2.5 rounded-xl bg-[#2F6BFF] hover:bg-[#2256d6] text-white font-semibold text-[13.5px] shadow-sm transition-all"
                >
                  Next question &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-[#8A99AE]">No questions found for this exam.</div>
          )}
        </div>

        {/* Sidebar Panel */}
        <aside className="run-aside border-l border-white/10 p-[22px] flex flex-col gap-5 overflow-y-auto bg-[#081627]/60">
          <div className="ring-timer flex flex-col items-center gap-2">
            <svg width="132" height="132" viewBox="0 0 132 132">
              <circle cx="66" cy="66" r="58" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
              <circle
                cx="66"
                cy="66"
                r="58"
                fill="none"
                stroke="#2F6BFF"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray="364"
                strokeDashoffset={364 - (364 * (timeRemaining / (45 * 60)))}
                className="transition-all"
              />
            </svg>
            <div className="t font-mono text-[26px] font-semibold text-white mt-[-92px]">{formatTimeRemaining(timeRemaining)}</div>
            <div className="lab text-[11px] text-[#8A99AE] tracking-widest font-mono uppercase mt-[62px]">Time remaining</div>
          </div>

          {/* Camera PIP View */}
          <div className="cam-pip rounded-2xl aspect-[4/3] bg-gradient-to-t from-[#0b2038] to-[#1c3c66] flex items-center justify-center border border-white/10 relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <div className="rec absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
              <i className="w-1.5 h-1.5 rounded-full bg-[#E04F4F]" />
              <span>REC</span>
            </div>
          </div>

          {/* Question Navigator */}
          <div>
            <div className="aside-h text-[11px] text-[#8A99AE] font-semibold uppercase font-mono mb-2">Question navigator</div>
            <div className="qnav grid grid-cols-6 gap-1.5">
              {questions.map((q, i) => {
                const isSelected = selectedAnswers[q.id] !== undefined;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`aspect-square rounded-lg font-mono text-xs flex items-center justify-center border ${i === currentIdx
                      ? 'bg-[#2F6BFF] text-white border-[#2F6BFF]'
                      : isSelected
                        ? 'bg-[#2f6bff]/20 text-[#cdddf6] border-[#2f6bff]/40'
                        : 'bg-white/5 text-[#9fb6d6] border-white/10'
                      }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col gap-2.5 mt-auto">
            <button
              onClick={() => handleGradingSubmit(false)}
              className="btn ghost flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-[#cdddf6] hover:bg-white/10 py-3 rounded-xl font-semibold text-[13.5px]"
            >
              <span>Raise hand</span>
              <span className="font-mono text-xs text-[#8A99AE]">{raiseCount}/5</span>
            </button>

            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="btn bg-[#F2A93B] hover:bg-[#e69f2c] text-[#3a2700] flex items-center justify-center py-3 rounded-xl font-semibold text-[13.5px] shadow-md"
            >
              Submit exam
            </button>
          </div>
        </aside>
      </div>

      {/* Submission Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-[#0b1f38]/60 backdrop-blur-[3px] flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl max-w-[460px] w-full p-[26px] shadow-2xl text-[#0E1B2E]">
            <h3 className="font-display text-[19px] font-semibold mb-2">Before you submit</h3>
            <p className="text-[13.5px] text-[#5C6B82] mb-5 leading-relaxed">
              Are you sure you want to finalize and submit your exam? You won't be able to re-enter this attempt session.
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                className="px-[18px] py-[11px] rounded-xl border border-[#E4EAF2] hover:bg-[#F4F7FC] hover:border-[#cdd8e8] font-semibold text-[13.5px] transition-all"
                onClick={() => setShowConfirmSubmit(false)}
              >
                Keep working
              </button>
              <button
                className="px-[18px] py-[11px] rounded-xl bg-[#2F6BFF] hover:bg-[#2256d6] text-white font-semibold text-[13.5px] shadow-[0_6px_16px_rgba(47,107,255,0.2)] transition-all"
                onClick={() => handleGradingSubmit(true)}
              >
                Submit anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />
    </div>
  );
}
