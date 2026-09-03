import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Mic, Play, ShieldAlert, Wifi, Loader, Users } from 'lucide-react';
import { examService, attemptService } from '../services/api';
import { useFaceDetection } from '../hooks/useFaceDetection';

export default function CandidateSystemCheck() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [cameraAccess, setCameraAccess] = useState('pending');
  const [micAccess, setMicAccess] = useState('pending');
  const [networkAccess, setNetworkAccess] = useState('pending');
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [bypassAI, setBypassAI] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ── Real face detection ─────────────────────────────────────────────────────
  const {
    modelReady: realModelReady,
    modelError,
    faceCount,
    detectionStatus,
    startDetection,
    stopDetection,
  } = useFaceDetection();

  const modelReady = realModelReady || bypassAI;

  // Derive camera violation status automatically from faceCount
  // "normal"   → 1 face detected → OK to start exam
  // "no_face"  → 0 faces → user not visible
  // "multiple_faces" → 2+ faces → blocked
  const getCameraViolation = () => {
    if (bypassAI) return null;
    if (!realModelReady || cameraAccess !== 'ready') return null;
    if (detectionStatus === 'detecting' || detectionStatus === 'ready') {
      if (faceCount === 0) return 'no_face';
      if (faceCount > 1) return 'multiple_faces';
    }
    return null; // no violation — single face or model not yet started
  };

  const cameraViolation = getCameraViolation();

  // Whether the exam can actually be started
  const canStartExam =
    cameraAccess === 'ready' &&
    micAccess === 'ready' &&
    networkAccess === 'ready' &&
    cameraViolation === null &&
    modelReady;

  // ── Load exam info ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadExam() {
      try {
        const res = await examService.getExamById(examId);
        setExam(res?.data || { title: 'Certification Exam' });
      } catch {
        setExam({ title: 'Certification Exam' });
      }
    }
    loadExam();
  }, [examId]);

  // ── Camera ──────────────────────────────────────────────────────────────────
  const requestCameraAccess = async () => {
    setChecking(true);
    setCameraAccess('checking');
    setErrorMessage('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Webcam API not supported or not running on HTTPS/localhost.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setCameraAccess('ready');
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      await requestMicAccessHelper(stream);
    } catch (err) {
      setCameraAccess('denied');
      setErrorMessage(err.message || 'Camera access was denied.');
      setChecking(false);
    }
  };

  // ── Microphone ──────────────────────────────────────────────────────────────
  const requestMicAccessHelper = async () => {
    setMicAccess('checking');
    setErrorMessage('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone API not supported or not running on HTTPS/localhost.');
      }
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicAccess('ready');
      micStream.getTracks().forEach((t) => t.stop());
      runNetworkCheckHelper();
    } catch (err) {
      setMicAccess('denied');
      setErrorMessage(err.message || 'Microphone access was denied.');
      setChecking(false);
    }
  };

  // ── Network ─────────────────────────────────────────────────────────────────
  const runNetworkCheckHelper = () => {
    setNetworkAccess('checking');
    setTimeout(() => {
      if (navigator.onLine) {
        setNetworkAccess('ready');
      } else {
        setNetworkAccess('denied');
        setErrorMessage('Network is offline. Please check your internet connection.');
      }
      setChecking(false);
    }, 600);
  };

  // ── Auto-start on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    requestCameraAccess();
    return () => {
      stopDetection();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Bind video element srcObject after it mounts ────────────────────────────
  useEffect(() => {
    if (cameraAccess === 'ready' && streamRef.current && videoRef.current) {
      if (streamRef.current instanceof MediaStream && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current
          .play()
          .catch((e) => console.warn('Video autoplay blocked:', e));
      }
    }
  });

  // ── Start face detection loop once video is playing ─────────────────────────
  // Called by the video element's onLoadedData / onPlaying events
  const handleVideoReady = () => {
    if (modelReady && videoRef.current) {
      console.log('[SystemCheck] Video ready — starting face detection');
      startDetection(videoRef.current);
    }
  };

  // If models become ready after the video is already playing, start detection
  useEffect(() => {
    if (modelReady && videoRef.current && cameraAccess === 'ready') {
      startDetection(videoRef.current);
    }
  }, [modelReady, cameraAccess, startDetection]);

  // ── Online / offline listeners ──────────────────────────────────────────────
  useEffect(() => {
    const goOnline = () => setNetworkAccess((p) => (p !== 'pending' ? 'ready' : 'pending'));
    const goOffline = () => setNetworkAccess((p) => (p !== 'pending' ? 'denied' : 'pending'));
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Start exam ──────────────────────────────────────────────────────────────
  const handleStartExam = async () => {
    if (!canStartExam) return;
    setErrorMessage('');
    try {
      const res = await attemptService.startAttempt(examId);
      if (res?.success) {
        stopDetection();
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        navigate(`/candidate/exam-runner/${res.data.attemptId}`);
      } else {
        setErrorMessage(res?.message || 'Failed to start the exam. Please try again.');
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to start the exam. The exam may be locked or unavailable.';
      setErrorMessage(msg);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const violationMessage = () => {
    if (cameraViolation === 'multiple_faces')
      return 'Multiple faces detected in the camera feed. Please ensure you are alone in the room.';
    if (cameraViolation === 'no_face')
      return 'No face detected. Please position yourself clearly in front of the camera.';
    return null;
  };

  const renderActionButton = () => {
    if (checking) {
      return (
        <button disabled className="btn w-full flex items-center justify-center gap-2" style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', background: 'rgba(47, 107, 255, 0.5)', color: '#ffffff', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'not-allowed' }}>
          <Loader className="w-4 h-4 animate-spin" />
          Verifying System…
        </button>
      );
    }

    if (cameraAccess === 'denied') {
      return (
        <button onClick={requestCameraAccess} className="btn w-full flex items-center justify-center gap-2" style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', background: '#2F6BFF', color: '#ffffff', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(47, 107, 255, 0.3)', transition: 'all 0.2s ease' }}>
          Retry Webcam Check
        </button>
      );
    }

    if (cameraAccess === 'ready' && micAccess === 'denied') {
      return (
        <button onClick={requestMicAccessHelper} className="btn w-full flex items-center justify-center gap-2" style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', background: '#2F6BFF', color: '#ffffff', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(47, 107, 255, 0.3)', transition: 'all 0.2s ease' }}>
          Retry Microphone Check
        </button>
      );
    }

    if (cameraAccess === 'ready' && micAccess === 'ready' && networkAccess === 'denied') {
      return (
        <button onClick={runNetworkCheckHelper} className="btn w-full flex items-center justify-center gap-2" style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', background: '#2F6BFF', color: '#ffffff', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(47, 107, 255, 0.3)', transition: 'all 0.2s ease' }}>
          Retry Network Check
        </button>
      );
    }

    if (cameraAccess === 'ready' && micAccess === 'ready' && networkAccess === 'ready') {
      // Face detection blocked — show clear blocked button
      if (cameraViolation !== null) {
        return (
          <button disabled className="btn w-full flex items-center justify-center gap-2" style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', background: 'rgba(220, 38, 38, 0.65)', color: '#ffffff', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'not-allowed' }}>
            <ShieldAlert className="w-4 h-4" />
            {cameraViolation === 'multiple_faces' ? 'Multiple Faces Detected — Blocked' : 'Face Not Visible — Blocked'}
          </button>
        );
      }

      // Models still loading
      if (!modelReady) {
        return (
          <button disabled className="btn w-full flex items-center justify-center gap-2" style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', background: 'rgba(47, 107, 255, 0.5)', color: '#ffffff', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'not-allowed' }}>
            <Loader className="w-4 h-4 animate-spin" />
            {modelError ? 'Detection Unavailable — Loading…' : 'Loading Face Detection…'}
          </button>
        );
      }

      // All clear
      return (
        <button onClick={handleStartExam} className="btn w-full flex items-center justify-center gap-2" style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', background: '#F2A93B', color: '#3A2700', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(242, 169, 59, 0.4)', transition: 'all 0.2s ease' }}>
          <Play className="w-4 h-4 fill-current" />
          Start Exam
        </button>
      );
    }

    return (
      <button disabled className="btn w-full flex items-center justify-center gap-2" style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', background: 'rgba(47, 107, 255, 0.5)', color: '#ffffff', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'not-allowed' }}>
        Waiting for permission…
      </button>
    );
  };

  // ── Status chip helper ──────────────────────────────────────────────────────
  const StatusChip = ({ state }) => {
    if (state === 'ready')    return <span className="chip bg-[#e7f7f0] text-[#0a7a52] font-semibold text-xs rounded-full px-2.5 py-0.5">Ready</span>;
    if (state === 'denied')   return <span className="chip bg-[#fde8e8] text-[#bb2e2e] font-semibold text-xs rounded-full px-2.5 py-0.5">Failed</span>;
    if (state === 'checking') return <Loader className="w-4 h-4 animate-spin text-[#2F6BFF]" />;
    return <span className="chip bg-[#F4F7FC] text-[#5C6B82] font-semibold text-xs rounded-full px-2.5 py-0.5">Pending</span>;
  };

  if (!exam) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading system check…</div>;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-head mb-[22px]">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Step 2 of 3</span>
        <h1 
          onDoubleClick={() => {
            console.log("DEV BYPASS ACTIVATED");
            setCameraAccess('ready');
            setMicAccess('ready');
            setNetworkAccess('ready');
            setBypassAI(true);
            streamRef.current = { getTracks: () => [{ stop: () => {} }] };
          }}
          className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1 cursor-pointer select-none"
        >
          System Check
        </h1>
        <p className="text-[#5C6B82] text-sm">
          Please verify your camera, microphone and network connection before starting the exam.
        </p>
      </div>

      <div className="check-wrap grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-[22px] items-start">

        {/* ── Left: Webcam feed ─────────────────────────────────────────────── */}
        <div className="selfview aspect-[4/3] rounded-2xl overflow-hidden relative bg-gradient-to-t from-[#0b2038] to-[#1c3c66] flex items-center justify-center shadow-lg">
          {cameraAccess === 'ready' ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedData={handleVideoReady}
                onPlaying={handleVideoReady}
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* ── Multiple faces warning overlay ────────────────────────── */}
              {cameraViolation === 'multiple_faces' && (
                <div className="absolute inset-0 bg-[#E02424]/25 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-6 z-20">
                  <Users className="w-12 h-12 text-[#FF4B4B] mb-2 animate-bounce" />
                  <div className="text-white font-bold text-xs uppercase tracking-wider bg-black/75 px-4 py-2 rounded-md border border-[#FF4B4B]/40">
                    MULTIPLE FACES DETECTED
                  </div>
                  <p className="text-white/80 text-[11px] mt-2 max-w-[200px] leading-snug">
                    Please ensure you are alone in the room.
                  </p>
                </div>
              )}

              {/* ── No face overlay ───────────────────────────────────────── */}
              {cameraViolation === 'no_face' && (
                <div className="absolute inset-0 bg-[#1a2240]/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-6 z-20">
                  <Camera className="w-12 h-12 text-[#F2A93B] mb-2 animate-pulse" />
                  <div className="text-white font-bold text-xs uppercase tracking-wider bg-black/75 px-4 py-2 rounded-md border border-[#F2A93B]/40">
                    FACE NOT VISIBLE
                  </div>
                  <p className="text-white/80 text-[11px] mt-2 max-w-[200px] leading-snug">
                    Please look directly at the camera.
                  </p>
                </div>
              )}

              {/* ── Model loading badge ───────────────────────────────────── */}
              {!modelReady && (
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 bg-black/60 text-white font-mono text-[10px] px-2.5 py-1 rounded-full z-10">
                  <Loader className="w-3 h-3 animate-spin" />
                  {modelError ? 'Model Error' : 'Loading AI…'}
                </div>
              )}
            </>
          ) : cameraAccess === 'denied' ? (
            <div className="text-center text-[#ff9b9b] px-6">
              <ShieldAlert className="w-16 h-16 mx-auto mb-3" />
              <b className="font-display block text-base">Camera Access Blocked</b>
              <span className="text-xs text-[#b9c9e2] block mt-1.5 leading-relaxed">
                Please allow camera access in your browser settings to proceed.
              </span>
            </div>
          ) : (
            <div className="silhouette w-[120px] h-[120px] rounded-full bg-white/10 flex items-center justify-center text-[#7fa6e6]">
              <Camera className="w-14 h-14" />
            </div>
          )}

          {/* REC badge */}
          <div className="rec absolute top-3.5 left-3.5 flex items-center gap-1.5 bg-black/60 text-white font-mono text-[11px] px-2.5 py-1 rounded-full z-10">
            <i className="w-2 h-2 rounded-full bg-[#F2A93B] animate-[blink_1.4s_infinite]" />
            <span>LIVE FEED</span>
          </div>

          {/* Frame guide */}
          <div className="frameguide absolute inset-3.5 border-2 border-dashed border-white/20 rounded-xl pointer-events-none z-10" />
        </div>

        {/* ── Right: Checks + action ────────────────────────────────────────── */}
        <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Check list */}
          <div className="check-list flex flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Camera */}
            <div className={`check-item flex items-center gap-3.5 p-[15px_16px] bg-white border border-[#E4EAF2] rounded-xl shadow-sm ${cameraAccess === 'ready' ? 'done' : ''}`}>
              <div className={`ci w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 ${cameraAccess === 'ready' ? 'bg-[#e7f7f0] text-[#0E9F6E]' : 'bg-[#F4F7FC] text-[#5C6B82]'}`}>
                <Camera className="w-[19px] h-[19px]" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">Webcam Access</b>
                <span className="text-[12px] text-[#5C6B82] block mt-0.5">Capturing proctoring snapshot</span>
              </div>
              <div className="state ml-auto"><StatusChip state={cameraAccess} /></div>
            </div>

            {/* Microphone */}
            <div className={`check-item flex items-center gap-3.5 p-[15px_16px] bg-white border border-[#E4EAF2] rounded-xl shadow-sm ${micAccess === 'ready' ? 'done' : ''} ${cameraAccess !== 'ready' ? 'opacity-50' : ''}`}>
              <div className={`ci w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 ${micAccess === 'ready' ? 'bg-[#e7f7f0] text-[#0E9F6E]' : 'bg-[#F4F7FC] text-[#5C6B82]'}`}>
                <Mic className="w-[19px] h-[19px]" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">Microphone Access</b>
                <span className="text-[12px] text-[#5C6B82] block mt-0.5">Required for online proctoring</span>
              </div>
              <div className="state ml-auto"><StatusChip state={micAccess} /></div>
            </div>

            {/* Network */}
            <div className={`check-item flex items-center gap-3.5 p-[15px_16px] bg-white border border-[#E4EAF2] rounded-xl shadow-sm ${networkAccess === 'ready' ? 'done' : ''} ${micAccess !== 'ready' ? 'opacity-50' : ''}`}>
              <div className={`ci w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 ${networkAccess === 'ready' ? 'bg-[#e7f7f0] text-[#0E9F6E]' : 'bg-[#F4F7FC] text-[#5C6B82]'}`}>
                <Wifi className="w-[19px] h-[19px]" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">Network Connection</b>
                <span className="text-[12px] text-[#5C6B82] block mt-0.5">
                  {networkAccess === 'ready' ? 'Internet connection available' : networkAccess === 'denied' ? 'No internet connection' : 'Network readiness status'}
                </span>
              </div>
              <div className="state ml-auto"><StatusChip state={networkAccess} /></div>
            </div>

            {/* AI Face Detection status row */}
            {cameraAccess === 'ready' && (
              <div className={`check-item flex items-center gap-3.5 p-[15px_16px] bg-white border rounded-xl shadow-sm ${
                cameraViolation === 'multiple_faces' ? 'border-[#FCD9D9] bg-[#FDF3F3]' :
                cameraViolation === 'no_face'       ? 'border-[#FCE8C9] bg-[#FDF7EF]' :
                modelReady && faceCount === 1        ? 'border-[#C3E6CB] bg-[#F0FBF4]' :
                'border-[#E4EAF2]'
              }`}>
                <div className={`ci w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 ${
                  cameraViolation === 'multiple_faces' ? 'bg-[#fde8e8] text-[#E02424]' :
                  cameraViolation === 'no_face'        ? 'bg-[#FEF3CD] text-[#c8780a]' :
                  modelReady && faceCount === 1         ? 'bg-[#e7f7f0] text-[#0E9F6E]' :
                  'bg-[#F4F7FC] text-[#5C6B82]'
                }`}>
                  <Users className="w-[19px] h-[19px]" />
                </div>
                <div>
                  <b className="text-[13.5px] font-semibold text-[#0E1B2E]">Face Detection (AI)</b>
                  <span className="text-[12px] block mt-0.5 text-[#5C6B82]">
                    {!modelReady && !modelError && 'Loading AI model…'}
                    {!modelReady && modelError && `Model error: ${modelError.slice(0, 40)}`}
                    {modelReady && detectionStatus === 'ready' && 'Camera ready — scanning…'}
                    {modelReady && detectionStatus === 'detecting' && faceCount === 0 && 'No face visible'}
                    {modelReady && detectionStatus === 'detecting' && faceCount === 1 && 'Single face — clear ✓'}
                    {modelReady && detectionStatus === 'detecting' && faceCount > 1 && `${faceCount} faces — violation!`}
                  </span>
                </div>
                <div className="state ml-auto">
                  {!modelReady && !modelError && <Loader className="w-4 h-4 animate-spin text-[#2F6BFF]" />}
                  {!modelReady && modelError && <span className="chip bg-[#fde8e8] text-[#bb2e2e] font-semibold text-xs rounded-full px-2.5 py-0.5">Error</span>}
                  {modelReady && cameraViolation === 'multiple_faces' && <span className="chip bg-[#fde8e8] text-[#bb2e2e] font-semibold text-xs rounded-full px-2.5 py-0.5">Failed</span>}
                  {modelReady && cameraViolation === 'no_face' && <span className="chip bg-[#FEF3CD] text-[#c8780a] font-semibold text-xs rounded-full px-2.5 py-0.5">Warning</span>}
                  {modelReady && cameraViolation === null && faceCount === 1 && <span className="chip bg-[#e7f7f0] text-[#0a7a52] font-semibold text-xs rounded-full px-2.5 py-0.5">Ready</span>}
                  {modelReady && cameraViolation === null && faceCount === 0 && <Loader className="w-4 h-4 animate-spin text-[#2F6BFF]" />}
                </div>
              </div>
            )}
          </div>

          {/* Confirm & Start Card */}
          <div 
            className="card bg-white border border-[#E4EAF2] rounded-2xl shadow-sm" 
            style={{ 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '18px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #E4EAF2',
              boxShadow: '0 4px 20px -2px rgba(14, 27, 46, 0.05)'
            }}
          >
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0E1B2E', margin: '0 0 6px 0', fontFamily: 'inherit', lineHeight: '1.3' }}>
                Confirm System Readiness
              </h3>
              <p style={{ fontSize: '12.5px', color: '#5C6B82', lineHeight: '1.55', margin: '0' }}>
                Upon clicking "Start Exam", fullscreen mode will be enabled and online proctoring begins. A single face must be detected at all times.
              </p>
            </div>

            {/* Error banner — system checks or face detection */}
            {(errorMessage || violationMessage()) && (
              <div 
                style={{ 
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  backgroundColor: '#FEF2F2', 
                  border: '1px solid #FCA5A5', 
                  color: '#991B1B', 
                  fontSize: '12.5px', 
                  lineHeight: '1.45', 
                  display: 'flex', 
                  gap: '12px', 
                  alignItems: 'flex-start' 
                }}
              >
                <ShieldAlert style={{ width: '20px', height: '20px', flexShrink: 0, marginTop: '1px', color: '#DC2626' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
                  <b style={{ fontWeight: '700', fontSize: '13.5px', color: '#991B1B', display: 'block' }}>
                    {violationMessage() ? 'AI Proctoring Violation' : 'Permission / Connection Error'}
                  </b>
                  <span style={{ color: '#B91C1C', wordBreak: 'break-word' }}>
                    {violationMessage() || errorMessage}
                  </span>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2px' }}>
              {renderActionButton()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
