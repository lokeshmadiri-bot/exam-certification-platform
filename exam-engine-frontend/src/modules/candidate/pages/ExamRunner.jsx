import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader, Check } from 'lucide-react';

import { ExamProvider, useExam } from '../context/ExamContext';
import { IntegrityProvider, useIntegrity } from '../context/IntegrityContext';
import { useKeyboardBlock } from '../hooks/useKeyboardBlock';
import { useRightClick } from '../hooks/useRightClick';
import WatermarkOverlay from '../components/WatermarkOverlay';
import FullscreenDialog from '../components/FullscreenDialog';
import Header from '../components/ExamHeader';
import Question from '../components/Question';
import Sidebar from '../components/ExamSidebar';
import Footer from '../components/ExamFooter';
import WarningModal from '../components/WarningModal';
import TerminateModal from '../components/TerminateModal';
import OfflineOverlay from '../components/OfflineOverlay';
import ReconnectLoader from '../components/ReconnectLoader';
import TimeUpModal from '../components/TimeUpModal';
import RecordingIndicator from '../components/RecordingIndicator';
import ViolationSummaryModal from '../components/ViolationSummaryModal';
import ThankYouPage from '../components/ThankYouPage';

import Reconnect from '../components/Reconnect';
import SubmitConfirmation from '../components/SubmitConfirmation';
import SectionStepper from '../components/SectionStepper';

import { useRecording } from '../hooks/useRecording';
import { useFullscreen } from '../hooks/useFullscreen';
import { useStrikeEngine } from '../hooks/useStrikeEngine';
import { useReconnect } from '../hooks/useReconnect';
import { useTimeUp } from '../hooks/useTimeUp';
import { useUnload } from '../hooks/useUnload';
import { useRecording as useModularRecording } from '../hooks/useRecording';
import { useAIFlags } from '../hooks/useAIFlags';
import { useCameraMonitor } from '../hooks/useCameraMonitor';

import { examService } from '../services/examService';
import { useExamTimer } from '../hooks/useExamTimer';

function ExamRunnerContent() {
  useKeyboardBlock();
  useRightClick();

  useEffect(() => {
    const handleDragStart = (e) => {
      e.preventDefault();
    };
    window.addEventListener('dragstart', handleDragStart, true);
    return () => {
      window.removeEventListener('dragstart', handleDragStart, true);
    };
  }, []);
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const {
    loading,
    setLoading,
    setQuestions,
    selectedAnswers,
    timeRemaining,
    setTimeRemaining,
    strikes,
    setStrikes,
    setWarningToast,
    showTimeUp,
    showThanks,
    setShowThanks,
    runnerRef,
    streamRef,
    setAttemptId,
    setSections,
    setAnswers,
    answers,
    offline,
    setOffline,
    setShowConfirmSubmit,
    videoRef
  } = useExam();

  // Reconnect hook
  const { online, syncing, reconnecting } = useReconnect({
    attemptId,
    answers,
    timeRemaining,
    setTimeRemaining,
    onResumed: () => setOffline(false)
  });

  const [examTitle, setExamTitle] = useState('Certification Exam');
  const [examDuration, setExamDuration] = useState(45 * 60);
  const [initialStrikeCount, setInitialStrikeCount] = useState(0);
  const [showViolationSummary, setShowViolationSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [showThankYouPage, setShowThankYouPage] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [terminatedState, setTerminatedState] = useState(false);
  const [submittingState, setSubmittingState] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('Submitting Exam...');
  const [loadError, setLoadError] = useState('');
  const isProctoringActive = !loading && online && !offline && !terminatedState && !submittingState && !showThanks && !showThankYouPage;

  // Modular recording & AI flags hooks declared at the top so they are in scope for all helper functions
  const { recording, stopAndUploadRecording } = useModularRecording({
    attemptId,
    active: isProctoringActive,
    streamRef,
    videoRef
  });

  const { fetchSummary, recordSilentFlag } = useAIFlags({
    attemptId,
    active: isProctoringActive
  });


  // Ensure the live webcam stream is bound to the sidebar PIP element once it mounts
  useEffect(() => {
    if (streamRef?.current && videoRef?.current) {
      if (streamRef.current instanceof MediaStream && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(err => console.warn("Exam runner PIP play failed:", err));
      }
    }
  });

  // Initialize and load attempt data
  useEffect(() => {
    async function loadAttempt() {
      try {
        setAttemptId(attemptId);

        // Fetch detailed runner data (sections, questions, previously saved answers)
        const runnerRes = await examService.getRunnerData(attemptId);
        const data = runnerRes.data;

        if (data.resultStatus === 'TERMINATED') {
          navigate('/candidate/terminated');
          return;
        }
        if (data.resultStatus === 'SUBMITTED' || data.resultStatus === 'PASSED' || data.resultStatus === 'FAILED' || data.resultStatus === 'NOT_PASSED') {
          navigate('/candidate');
          return;
        }

        setExamTitle(data.examTitle || 'Certification Exam');
        setInitialStrikeCount(data.strikeCount || 0);
        setStrikes(data.strikeCount || 0);

        // Assemble flat questions list from sections
        const allQuestions = [];
        const loadedSections = data.sections || [];
        loadedSections.forEach((sec) => {
          if (sec.questions) {
            sec.questions.forEach((q) => {
              q.sectionName = sec.name;
              allQuestions.push(q);
            });
          }
        });

        if (allQuestions.length === 0) {
          throw new Error("This exam does not contain any questions. Please check the question bank or section settings.");
        }

        setSections(loadedSections);
        setQuestions(allQuestions);
        setAnswers(data.answers || {});
      } catch (err) {
        console.error('Failed to load runner data:', err);
        setLoadError(err?.response?.data?.message || err?.message || 'Failed to load exam data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId, setQuestions, setLoading, setAttemptId, setSections, setAnswers, navigate, setStrikes]);

  const handleGradingSubmit = async (forceSubmit = false) => {
    if (terminatedState) {
      console.log("Skipping grading submit because attempt has been terminated.");
      return;
    }

    setSubmittingState(true);
    setShowThanks(true);
    setSubmitStatusText('Uploading proctoring recording...');

    // Stop and upload recording before calling backend submit
    try {
      console.log('[ExamRunner] Stopping and uploading recording inside handleGradingSubmit…');
      await stopAndUploadRecording(attemptId);
      console.log('[ExamRunner] Recording upload finished.');
    } catch (err) {
      console.warn('[ExamRunner] Recording upload error during grading submit (non-blocking):', err);
    }

    setSubmitStatusText('Finalizing exam results...');

    const request = {
      attemptId,
      forceSubmit: forceSubmit || false,
      answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption
      }))
    };
    console.log("Submit Request:", JSON.stringify(request, null, 2));
    try {

      const res = await examService.submitAttemptNew(request);

      if (res.success) {

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
          } catch (e) {
            console.warn("Unable to exit fullscreen", e);
          }
        }

        setShowThanks(false);
        setShowThankYouPage(true);

      }

    } catch (err) {
      setShowThanks(false);
      setSubmittingState(false);
      console.error("Submit Error:", err);
      if (err.response) {
        console.log("Status:", err.response.status);
        console.log("Response:", err.response.data);
      }
      const errMsg = err.response?.data?.message || err.message || 'Submission failed. Please check your network and try again.';
      setSubmitError(errMsg);
    }

  };

  useExamTimer(terminatedState ? null : handleGradingSubmit);

  // Maintain refs for unload/sendBeacon handlers to access latest values
  const answersRef = React.useRef(answers);
  const timeRemainingRef = React.useRef(timeRemaining);
  useEffect(() => {
    answersRef.current = answers;
    timeRemainingRef.current = timeRemaining;
  }, [answers, timeRemaining]);


  // Time-up hook
  const { submitting, isTimeUp } = useTimeUp({
    attemptId,
    initialSeconds: timeRemaining,
    answers,
    active: !loading && online && !offline && !terminatedState,
    onAutoSubmit: handleGradingSubmit
  });

  // Unload / sendBeacon hook
  useUnload({
    attemptId,
    answersRef,
    timeRemainingRef,
    active: !loading
  });


  const handleInitialSubmitTrigger = async () => {
    setShowConfirmSubmit(false);
    try {
      const summary = await fetchSummary(attemptId);
      setSummaryData(summary || { warnings: strikes, aiFlags: [] });
      setShowViolationSummary(true);
    } catch (e) {
      setSummaryData({ warnings: strikes, aiFlags: [] });
      setShowViolationSummary(true);
    }
  };

  const handleFinalSubmitAnyway = async () => {
    setShowViolationSummary(false);
    await handleGradingSubmit(true);
  };

  const handleFrontendTerminate = () => {
    setTerminatedState(true);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try { if (document.exitFullscreen) document.exitFullscreen(); } catch (_) { }
    navigate('/candidate/terminated');
  };

  const {
    strikeCount,
    violations,
    warningVisible,
    terminated,
    dismissWarning,
    handleViolation
  } = useStrikeEngine({
    attemptId,
    initialStrikeCount,
    active: isProctoringActive,
    onTerminate: handleFrontendTerminate,
    videoRef
  });

  // Sync strike count back to global ExamContext so headers/indicators render it correctly
  useEffect(() => {
    setStrikes(strikeCount);
  }, [strikeCount, setStrikes]);

  const { enterFullscreenMode } = useFullscreen();

  // Continuous camera monitoring (real face detection during exam)
  useCameraMonitor({
    videoRef,
    active: isProctoringActive,
    handleViolation,
    recordSilentFlag,
    attemptId
  });

  // Expose simulated violation handler globally for dev testing (kept for debugging)
  useEffect(() => {
    window.simulateProctorViolation = (type) => {
      console.log(`[Simulated Proctor Violation] ${type}`);
      recordSilentFlag(type);
      handleViolation(type);
    };
    return () => {
      delete window.simulateProctorViolation;
    };
  }, [recordSilentFlag, handleViolation]);

  // Request Fullscreen on launch
  useEffect(() => {
    if (!loading) {
      enterFullscreenMode();
    }
  }, [loading]);

  // Ensure proctoring camera and microphone streams are completely stopped and released on unmount or completion
  useEffect(() => {
    return () => {
      if (streamRef && streamRef.current) {
        console.log("Stopping and releasing proctoring stream tracks on runner unmount");
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.error("Error stopping track:", e);
          }
        });
        streamRef.current = null;
      }
    };
  }, [streamRef]);

  if (loadError) {
    return (
      <div style={{
        backgroundColor: '#081627',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e8eefb',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Failed to Load Exam</h2>
        <p style={{ color: '#8A99AE', fontSize: '14px', maxWidth: '400px', marginBottom: '24px', lineHeight: '1.6' }}>
          {loadError}
        </p>
        <button
          onClick={() => navigate('/candidate')}
          style={{
            backgroundColor: '#2F6BFF',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-20 font-mono text-sm text-white bg-[#081627] min-h-screen flex items-center justify-center gap-2">
        <Loader className="w-5 h-5 animate-spin" />
        <span>Loading proctored exam runner...</span>
      </div>
    );
  }

  return (
    <div ref={runnerRef} className="runner fixed inset-0 z-50 bg-gradient-to-br from-[#081627] to-[#102a4d] text-[#e8eefb] flex flex-col overflow-hidden select-none">
      {/* Integrity Dialog and Watermark Overlay */}
      <FullscreenDialog />
      <WatermarkOverlay />

      {/* Warnings & Modals */}
      <WarningModal isOpen={warningVisible} strikeCount={strikeCount} lastViolation={violations[violations.length - 1]} onClose={dismissWarning} />
      <TerminateModal isOpen={terminated} />
      <OfflineOverlay isOpen={!online || offline} />
      <ReconnectLoader isOpen={syncing || reconnecting} />
      <TimeUpModal isOpen={isTimeUp} />
      <ViolationSummaryModal
        isOpen={showViolationSummary}
        summary={summaryData}
        onConfirmSubmit={handleFinalSubmitAnyway}
        onClose={() => setShowViolationSummary(false)}
      />
      <ThankYouPage isOpen={showThankYouPage} attemptId={attemptId} />
      <Reconnect />
      <SubmitConfirmation onConfirm={handleInitialSubmitTrigger} />
      <SubmitErrorModal isOpen={!!submitError} message={submitError} onClose={() => setSubmitError('')} />

      {/* Time's Up Blockout */}
      {showTimeUp && (
        <div className="run-overlay fixed inset-0 z-50 bg-[#061222]/90 backdrop-blur-md flex items-center justify-center">
          <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[34px_38px] text-center max-w-[430px] shadow-2xl">
            <h3 className="font-display text-white text-[21px] font-semibold mb-2">Time's up</h3>
            <p className="text-[#b9c9e2] text-[13.5px]">Submitting the answers you've completed. Please wait…</p>
          </div>
        </div>
      )}

      {/* Thanks Submission Blockout */}
      {showThanks && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#061222', // solid background to block out the exam page
            padding: '24px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#0a1628',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '40px 32px 32px 32px',
              maxWidth: '430px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)'
            }}
          >
            <div 
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '2px solid #10B981',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
              }}
            >
              {/* Spinner */}
              <div className="w-8 h-8 border-4 border-t-[#10B981] border-r-transparent border-b-[#10B981] border-l-transparent rounded-full animate-spin" />
            </div>
            <h3 
              style={{
                color: '#ffffff',
                fontSize: '21px',
                fontWeight: '700',
                margin: '0 0 12px 0'
              }}
            >
              {submitStatusText}
            </h3>
            <p 
              style={{
                color: '#b9c9e2',
                fontSize: '14px',
                lineHeight: '1.6',
                margin: 0
              }}
            >
              Uploading proctoring recording and finalizing your results. Please do not close or refresh this page.
            </p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header examTitle={examTitle} attemptId={attemptId} />

      {/* Main Runner Screen Layout */}
      <div className="run-body flex-1 grid grid-cols-1 lg:grid-cols-[1fr_350px] overflow-hidden">
        <div className="run-main p-[30px_38px] overflow-y-auto">
          <SectionStepper />
          <Question />
          <Footer />
        </div>

        <Sidebar durationSeconds={examDuration} />
      </div>
    </div>
  );
}

export default function ExamRunner() {
  return (
    <ExamProvider>
      <IntegrityProvider>
        <ExamRunnerContent />
      </IntegrityProvider>
    </ExamProvider>
  );
}

function SubmitErrorModal({ isOpen, message, onClose }) {
  if (!isOpen) return null;
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(6, 18, 34, 0.9)',
        backdropFilter: 'blur(6px)',
        padding: '24px',
        userSelect: 'none'
      }}
    >
      <div 
        style={{
          backgroundColor: '#0e2745',
          border: '2px solid #E04F4F',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '430px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: '#e8eefb'
        }}
      >
        <div 
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(224, 79, 79, 0.1)',
            border: '2px solid #E04F4F',
            color: '#E04F4F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="font-display text-white text-[22px] font-bold mb-2">Submission Failed</h3>
        <p className="text-[#b9c9e2] text-[14px] leading-relaxed mb-6">
          {message}
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 px-6 rounded-xl bg-[#E04F4F] hover:bg-[#c93d3d] text-white font-semibold text-sm transition-all cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
