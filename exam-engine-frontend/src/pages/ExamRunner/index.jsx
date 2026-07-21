import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader, Check } from 'lucide-react';

import { ExamProvider, useExam } from '../../context/ExamContext';
import { IntegrityProvider, useIntegrity } from '../../context/IntegrityContext';
import { useKeyboardBlock } from '../../hooks/useKeyboardBlock';
import { useRightClick } from '../../hooks/useRightClick';
import WatermarkOverlay from '../../components/exam/WatermarkOverlay';
import FullscreenDialog from '../../components/exam/FullscreenDialog';
import Header from '../../components/exam/Header';
import Question from '../../components/exam/Question';
import Sidebar from '../../components/exam/Sidebar';
import Footer from '../../components/exam/Footer';
import WarningModal from '../../exam/components/WarningModal';
import TerminateModal from '../../exam/components/TerminateModal';
import OfflineOverlay from '../../exam/components/OfflineOverlay';
import ReconnectLoader from '../../exam/components/ReconnectLoader';
import TimeUpModal from '../../exam/components/TimeUpModal';
import RecordingIndicator from '../../exam/components/RecordingIndicator';
import ViolationSummaryModal from '../../exam/components/ViolationSummaryModal';
import ThankYouPage from '../../exam/components/ThankYouPage';

import RaiseHand from '../../components/exam/RaiseHand';
import Reconnect from '../../components/exam/Reconnect';
import SubmitConfirmation from '../../components/exam/SubmitConfirmation';
import SectionStepper from '../../components/exam/SectionStepper';

import { useRecording } from '../../hooks/useRecording';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useStrikeEngine } from '../../exam/hooks/useStrikeEngine';
import { useReconnect } from '../../exam/hooks/useReconnect';
import { useTimeUp } from '../../exam/hooks/useTimeUp';
import { useUnload } from '../../exam/hooks/useUnload';
import { useRecording as useModularRecording } from '../../exam/hooks/useRecording';
import { useAIFlags } from '../../exam/hooks/useAIFlags';

import { examService } from '../../services/examService';
import { useExamTimer } from '../../hooks/useExamTimer';

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
    handRaised,
    offline,
    setOffline
  } = useExam();

  const [examTitle, setExamTitle] = useState('Certification Exam');
  const [examDuration, setExamDuration] = useState(45 * 60);
  const [initialStrikeCount, setInitialStrikeCount] = useState(0);
  const [showViolationSummary, setShowViolationSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [showThankYouPage, setShowThankYouPage] = useState(false);

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
        
        setSections(loadedSections);
        setQuestions(allQuestions);
        setAnswers(data.answers || {});
      } catch (err) {
        console.error('Failed to load runner data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId, setQuestions, setLoading, setAttemptId, setSections, setAnswers, navigate, setStrikes]);

  const handleGradingSubmit = async () => {
    setShowThanks(true);

    try {
      const res = await examService.submitAttemptNew(attemptId);
      if (res.success) {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        try { if (document.exitFullscreen) document.exitFullscreen(); } catch (_) {}
        setShowThanks(false);
        setShowThankYouPage(true);
      }
    } catch (err) {
      console.error('Failed to submit attempt:', err);
    }
  };

  useExamTimer(handleGradingSubmit);

  // Maintain refs for unload/sendBeacon handlers to access latest values
  const answersRef = React.useRef(answers);
  const timeRemainingRef = React.useRef(timeRemaining);
  useEffect(() => {
    answersRef.current = answers;
    timeRemainingRef.current = timeRemaining;
  }, [answers, timeRemaining]);

  // Reconnect hook
  const { online, syncing, reconnecting } = useReconnect({
    attemptId,
    answers,
    timeRemaining,
    setTimeRemaining,
    onResumed: () => setOffline(false)
  });

  // Time-up hook
  const { submitting, isTimeUp } = useTimeUp({
    attemptId,
    initialSeconds: timeRemaining,
    answers,
    active: !loading && !handRaised && online && !offline,
    onAutoSubmit: handleGradingSubmit
  });

  // Unload / sendBeacon hook
  useUnload({
    attemptId,
    answersRef,
    timeRemainingRef,
    active: !loading
  });

  // Modular recording & AI flags hooks
  const { recording, stopAndUploadRecording } = useModularRecording({
    attemptId,
    active: !loading,
    streamRef,
    videoRef: null
  });

  const { fetchSummary } = useAIFlags({
    attemptId,
    active: !loading
  });

  const handleInitialSubmitTrigger = async () => {
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
    stopAndUploadRecording(attemptId).catch(() => {});
    await handleGradingSubmit();
  };

  const isProctoringActive = !loading && !handRaised && online && !offline;

  const handleFrontendTerminate = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try { if (document.exitFullscreen) document.exitFullscreen(); } catch (_) {}
    navigate('/candidate/terminated');
  };

  const {
    strikeCount,
    warningVisible,
    terminated,
    dismissWarning
  } = useStrikeEngine({
    attemptId,
    initialStrikeCount,
    active: isProctoringActive,
    onTerminate: handleFrontendTerminate
  });

  // Sync strike count back to global ExamContext so headers/indicators render it correctly
  useEffect(() => {
    setStrikes(strikeCount);
  }, [strikeCount, setStrikes]);

  const { enterFullscreenMode } = useFullscreen();

  // Request Fullscreen on launch
  useEffect(() => {
    if (!loading) {
      enterFullscreenMode();
    }
  }, [loading]);

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
      <WarningModal isOpen={warningVisible} strikeCount={strikeCount} onClose={dismissWarning} />
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
      <RaiseHand />
      <SubmitConfirmation onConfirm={handleInitialSubmitTrigger} />

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
        <div className="run-overlay fixed inset-0 z-50 bg-[#061222]/90 backdrop-blur-md flex items-center justify-center">
          <div className="ov-card bg-[#0e2745] border border-white/10 rounded-2xl p-[34px_38px] text-center max-w-[430px] shadow-2xl">
            <div className="ov-ic w-14 h-14 rounded-2xl bg-[#0e9f6e]/20 text-[#34d27b] flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="font-display text-white text-[21px] font-semibold mb-2">Submission received</h3>
            <p className="text-[#b9c9e2] text-[13.5px]">
              Thank you. Your answers have been recorded and are being scored. Your result will appear in a moment…
            </p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header examTitle={examTitle} attemptId={attemptId} />

      {/* Main Runner Screen Layout */}
      <div className="run-body flex-1 grid grid-cols-1 lg:grid-cols-[1fr_330px] overflow-hidden">
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
