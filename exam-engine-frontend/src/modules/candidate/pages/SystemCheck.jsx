import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Mic, Play, ShieldAlert, Wifi, Loader } from 'lucide-react';
import { examService, attemptService } from '../services/api';

export default function CandidateSystemCheck() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [cameraAccess, setCameraAccess] = useState("pending");
  const [micAccess, setMicAccess] = useState("pending");
  const [networkAccess, setNetworkAccess] = useState("pending");
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [proctorCheckStatus, setProctorCheckStatus] = useState("normal"); // "normal", "multiple_faces", "mobile_phone", "suspicious_activity"
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    async function loadExam() {
      try {
        const res = await examService.getExamById(examId);
        setExam(res?.data || { title: "Certification Exam" });
      } catch (err) {
        console.warn("Failed to load exam details from server, falling back to mock:", err);
        setExam({ title: "Certification Exam" });
      }
    }
    loadExam();
  }, [examId]);

  const requestCameraAccess = async () => {
    setChecking(true);
    setCameraAccess("checking");
    setErrorMessage("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam API is not supported or not running in a secure context (HTTPS or localhost).");
      }
      console.log("Requesting camera permission explicitly");
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 320,
          height: 240
        }
      });
      console.log("Camera permission granted successfully");
      setCameraAccess("ready");
      streamRef.current = cameraStream;
      if (videoRef.current) {
        videoRef.current.srcObject = cameraStream;
      }
      // Automatically request microphone permission next
      await requestMicAccessHelper(cameraStream);
    } catch (err) {
      console.error("Camera access failed or denied:", err);
      setCameraAccess("denied");
      setErrorMessage(err.message || "Camera access was denied.");
      setChecking(false);
    }
  };

  const requestMicAccessHelper = async (camStream) => {
    setMicAccess("checking");
    setErrorMessage("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone API is not supported or not running in a secure context.");
      }
      console.log("Requesting microphone permission explicitly");
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      console.log("Microphone permission granted successfully");
      setMicAccess("ready");
      // Stop microphone tracks immediately so there is no echo/feedback loop
      micStream.getTracks().forEach((track) => track.stop());

      // Automatically trigger network check next
      runNetworkCheckHelper();
    } catch (err) {
      console.error("Microphone access failed or denied:", err);
      setMicAccess("denied");
      setErrorMessage(err.message || "Microphone access was denied.");
      setChecking(false);
    }
  };

  const runNetworkCheckHelper = () => {
    setNetworkAccess("checking");
    setTimeout(() => {
      if (navigator.onLine) {
        setNetworkAccess("ready");
      } else {
        setNetworkAccess("denied");
        setErrorMessage("Network is offline. Please check your internet connection.");
      }
      setChecking(false);
    }, 600); // Small delay to feel premium
  };

  const runSystemCheck = async () => {
    if (cameraAccess !== 'ready') {
      await requestCameraAccess();
    } else if (micAccess !== 'ready') {
      await requestMicAccessHelper(streamRef.current);
    } else if (networkAccess !== 'ready') {
      runNetworkCheckHelper();
    }
  };

  // Run the sequence immediately on component mount
  useEffect(() => {
    requestCameraAccess();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Ensure video element srcObject is set after it is rendered and mounted
  useEffect(() => {
    if (cameraAccess === 'ready' && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(err => console.warn("Video play failed:", err));
      }
    }
  });

  // Register online/offline status listeners on mount
  useEffect(() => {
    const handleOnline = () => {
      setNetworkAccess((prev) => (prev !== "pending" ? "ready" : "pending"));
    };

    const handleOffline = () => {
      setNetworkAccess((prev) => (prev !== "pending" ? "denied" : "pending"));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleStartExam = async () => {
    if (proctorCheckStatus !== 'normal') return;
    setErrorMessage('');
    try {
      // Create exam attempt record on the backend
      const res = await attemptService.startAttempt(examId);
      if (res && res.success) {
        // Clean stream tracks so that the runner can re-capture or preserve it
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        navigate(`/candidate/exam-runner/${res.data.attemptId}`);
      } else {
        // Backend returned a non-success response
        const msg = res?.message || 'Failed to start the exam. Please try again.';
        setErrorMessage(msg);
      }
    } catch (err) {
      console.error('Failed to initialize attempt:', err);
      // Extract the most meaningful error message from the backend response
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to start the exam. The exam may be locked or unavailable.';
      setErrorMessage(msg);
    }
  };

  const renderActionButtons = () => {
    if (checking) {
      return (
        <button
          disabled
          className="btn bg-[#2F6BFF]/50 text-white flex items-center justify-center gap-1.5 w-full font-semibold text-[13.5px] py-3.5 rounded-xl shadow-md"
        >
          <Loader className="w-4 h-4 animate-spin" />
          <span>Verifying System...</span>
        </button>
      );
    }

    if (cameraAccess === 'denied') {
      return (
        <button
          onClick={requestCameraAccess}
          className="btn bg-[#E02424] hover:bg-[#c81e1e] text-white flex items-center justify-center gap-1.5 w-full font-semibold text-[13.5px] py-3.5 rounded-xl shadow-md transition-all"
        >
          <span>Retry Webcam Check</span>
        </button>
      );
    }

    if (cameraAccess === 'ready' && micAccess === 'denied') {
      return (
        <button
          onClick={() => requestMicAccessHelper(streamRef.current)}
          className="btn bg-[#E02424] hover:bg-[#c81e1e] text-white flex items-center justify-center gap-1.5 w-full font-semibold text-[13.5px] py-3.5 rounded-xl shadow-md transition-all"
        >
          <span>Retry Microphone Check</span>
        </button>
      );
    }

    if (cameraAccess === 'ready' && micAccess === 'ready' && networkAccess === 'denied') {
      return (
        <button
          onClick={runNetworkCheckHelper}
          className="btn bg-[#E02424] hover:bg-[#c81e1e] text-white flex items-center justify-center gap-1.5 w-full font-semibold text-[13.5px] py-3.5 rounded-xl shadow-md transition-all"
        >
          <span>Retry Network Check</span>
        </button>
      );
    }

    // Only show Start Exam when all checks are ready
    if (cameraAccess === 'ready' && micAccess === 'ready' && networkAccess === 'ready') {
      if (proctorCheckStatus !== 'normal') {
        return (
          <button
            disabled
            className="btn bg-[#E02424]/60 text-white flex items-center justify-center gap-1.5 w-full font-semibold text-[13.5px] py-3.5 rounded-xl shadow-none cursor-not-allowed"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Webcam Verification Blocked</span>
          </button>
        );
      }
      return (
        <button
          onClick={handleStartExam}
          className="btn bg-[#F2A93B] hover:bg-[#e69f2c] text-[#3a2700] flex items-center justify-center gap-1.5 w-full font-semibold text-[13.5px] py-3.5 rounded-xl shadow-md transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Start Exam</span>
        </button>
      );
    }

    // Default fallback while pending / starting up
    return (
      <button
        disabled
        className="btn bg-[#2F6BFF]/50 text-white flex items-center justify-center gap-1.5 w-full font-semibold text-[13.5px] py-3.5 rounded-xl shadow-md"
      >
        <span>Waiting for permission...</span>
      </button>
    );
  };

  if (!exam) {
    return <div className="text-center py-10 font-mono text-sm text-[#8A99AE]">Loading system check...</div>;
  }

  return (
    <div>
      <div className="page-head mb-[22px]">
        <span className="eyebrow font-mono text-xs font-semibold text-[#2F6BFF] uppercase tracking-[1.4px]">Step 2 of 3</span>
        <h1 className="font-display font-bold text-[27px] text-[#0E1B2E] mt-1 mb-1">System Check</h1>
        <p className="text-[#5C6B82] text-sm">
          Please verify your camera, microphone and network connection before starting the exam.
        </p>
      </div>

      <div className="check-wrap grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-[22px] items-start">
        {/* Left Side: Live Webcam View */}
        <div className="selfview aspect-[4/3] rounded-2xl overflow-hidden relative bg-gradient-to-t from-[#0b2038] to-[#1c3c66] flex items-center justify-center shadow-lg">
          {cameraAccess === 'ready' ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {proctorCheckStatus !== 'normal' && (
                <div className="absolute inset-0 bg-[#E02424]/20 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-6 z-20">
                  <ShieldAlert className="w-12 h-12 text-[#FF4B4B] mb-2 animate-bounce" />
                  <div className="text-white font-bold text-xs uppercase tracking-wider bg-black/75 px-3.5 py-1.5 rounded-md border border-[#FF4B4B]/30">
                    {proctorCheckStatus === 'multiple_faces' && 'MULTIPLE FACES DETECTED'}
                    {proctorCheckStatus === 'mobile_phone' && 'MOBILE PHONE DETECTED'}
                    {proctorCheckStatus === 'suspicious_activity' && 'SUSPICIOUS ACTIVITY'}
                  </div>
                </div>
              )}
            </>
          ) : cameraAccess === 'denied' ? (
            <div className="text-center text-[#ff9b9b] px-6">
              <ShieldAlert className="w-16 h-16 mx-auto mb-3" />
              <b className="font-display block text-base">Camera Access Blocked</b>
              <span className="text-xs text-[#b9c9e2] block mt-1.5 leading-relaxed">
                Please allow camera access in your browser settings to proceed with the exam proctoring session.
              </span>
            </div>
          ) : (
            <div className="silhouette w-[120px] h-[120px] rounded-full bg-white/10 flex items-center justify-center text-[#7fa6e6]">
              <Camera className="w-14 h-14" />
            </div>
          )}

          <div className="rec absolute top-3.5 left-3.5 flex items-center gap-1.5 bg-black/60 text-white font-mono text-[11px] px-2.5 py-1 rounded-full z-10">
            <i className="w-2 h-2 rounded-full bg-[#F2A93B] animate-[blink_1.4s_infinite]" />
            <span>LIVE FEED</span>
          </div>

          <div className="frameguide absolute inset-3.5 border-2 border-dashed border-white/20 rounded-xl pointer-events-none z-10" />
        </div>

        {/* Right Side: Check status list & simulation */}
        <div className="space-y-4">
          <div className="check-list flex flex-col gap-3">
            {/* Camera Check */}
            <div className={`check-item flex items-center gap-3.5 p-[15px_16px] bg-white border border-[#E4EAF2] rounded-xl shadow-sm ${cameraAccess === 'ready' ? 'done' : ''}`}>
              <div className={`ci w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 ${cameraAccess === 'ready' ? 'bg-[#e7f7f0] text-[#0E9F6E]' : 'bg-[#F4F7FC] text-[#5C6B82]'}`}>
                <Camera className="w-[19px] h-[19px]" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">Webcam Access</b>
                <span className="text-[12px] text-[#5C6B82] block mt-0.5">Capturing proctoring snapshot</span>
              </div>
              <div className="state ml-auto font-mono text-xs">
                {cameraAccess === 'ready' ? (
                  <span className="chip ok bg-[#e7f7f0] text-[#0a7a52] font-semibold rounded-full px-2.5 py-0.5">Ready</span>
                ) : cameraAccess === 'denied' ? (
                  <span className="chip bad bg-[#fde8e8] text-[#bb2e2e] font-semibold rounded-full px-2.5 py-0.5">Failed</span>
                ) : cameraAccess === 'checking' ? (
                  <Loader className="w-4 h-4 animate-spin text-[#2F6BFF]" />
                ) : (
                  <span className="chip bg-[#F4F7FC] text-[#5C6B82] font-semibold rounded-full px-2.5 py-0.5">Pending</span>
                )}
              </div>
            </div>

            {/* Microphone Check */}
            <div className={`check-item flex items-center gap-3.5 p-[15px_16px] bg-white border border-[#E4EAF2] rounded-xl shadow-sm ${micAccess === 'ready' ? 'done' : ''} ${cameraAccess !== 'ready' ? 'opacity-50' : ''}`}>
              <div className={`ci w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 ${micAccess === 'ready' ? 'bg-[#e7f7f0] text-[#0E9F6E]' : 'bg-[#F4F7FC] text-[#5C6B82]'}`}>
                <Mic className="w-[19px] h-[19px]" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">Microphone Access</b>
                <span className="text-[12px] text-[#5C6B82] block mt-0.5">Required for online proctoring</span>
              </div>
              <div className="state ml-auto font-mono text-xs">
                {micAccess === 'ready' ? (
                  <span className="chip ok bg-[#e7f7f0] text-[#0a7a52] font-semibold rounded-full px-2.5 py-0.5">Ready</span>
                ) : micAccess === 'denied' ? (
                  <span className="chip bad bg-[#fde8e8] text-[#bb2e2e] font-semibold rounded-full px-2.5 py-0.5">Failed</span>
                ) : micAccess === 'checking' ? (
                  <Loader className="w-4 h-4 animate-spin text-[#2F6BFF]" />
                ) : (
                  <span className="chip bg-[#F4F7FC] text-[#5C6B82] font-semibold rounded-full px-2.5 py-0.5">Pending</span>
                )}
              </div>
            </div>

            {/* Network Stability Check */}
            <div className={`check-item flex items-center gap-3.5 p-[15px_16px] bg-white border border-[#E4EAF2] rounded-xl shadow-sm ${networkAccess === 'ready' ? 'done' : ''} ${micAccess !== 'ready' ? 'opacity-50' : ''}`}>
              <div className={`ci w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 ${networkAccess === 'ready' ? 'bg-[#e7f7f0] text-[#0E9F6E]' : 'bg-[#F4F7FC] text-[#5C6B82]'}`}>
                <Wifi className="w-[19px] h-[19px]" />
              </div>
              <div>
                <b className="text-[13.5px] font-semibold text-[#0E1B2E]">Network Connection</b>
                <span className="text-[12px] text-[#5C6B82] block mt-0.5">
                  {networkAccess === "ready"
                    ? "Internet connection available"
                    : networkAccess === "denied"
                    ? "No internet connection"
                    : "Network readiness status"}
                </span>
              </div>
              <div className="state ml-auto font-mono text-xs">
                {networkAccess === 'ready' ? (
                  <span className="chip ok bg-[#e7f7f0] text-[#0a7a52] font-semibold rounded-full px-2.5 py-0.5">Ready</span>
                ) : networkAccess === 'denied' ? (
                  <span className="chip bad bg-[#fde8e8] text-[#bb2e2e] font-semibold rounded-full px-2.5 py-0.5">Offline</span>
                ) : networkAccess === 'checking' ? (
                  <Loader className="w-4 h-4 animate-spin text-[#2F6BFF]" />
                ) : (
                  <span className="chip bg-[#F4F7FC] text-[#5C6B82] font-semibold rounded-full px-2.5 py-0.5">Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* Webcam Environment Simulation Control Card */}
          {cameraAccess === 'ready' && (
            <div className="card pad bg-white border border-[#E4EAF2] rounded-xl p-5 shadow-sm" style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '12px' }}>
              <h3 className="font-display font-bold text-xs text-[#0E1B2E] uppercase tracking-wider mb-2" style={{ fontSize: '11px' }}>Webcam Detection Simulation</h3>
              <p className="text-[12px] text-[#5C6B82] leading-relaxed mb-4">
                Select an environment state to simulate AI webcam checks. Suspicious conditions block exam startup.
              </p>
              <div className="grid grid-cols-2 gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <button
                  onClick={() => setProctorCheckStatus("normal")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${proctorCheckStatus === 'normal' ? 'bg-[#e7f7f0] border-[#0E9F6E] text-[#0a7a52]' : 'bg-[#F8FAFC] border-[#E4EAF2] text-[#5C6B82] hover:bg-[#EEF2F8]'}`}
                >
                  Normal (1 Face)
                </button>
                <button
                  onClick={() => setProctorCheckStatus("multiple_faces")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${proctorCheckStatus === 'multiple_faces' ? 'bg-[#FDF3F3] border-[#E02424] text-[#9B1C1C]' : 'bg-[#F8FAFC] border-[#E4EAF2] text-[#5C6B82] hover:bg-[#EEF2F8]'}`}
                >
                  Multiple Faces
                </button>
                <button
                  onClick={() => setProctorCheckStatus("mobile_phone")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${proctorCheckStatus === 'mobile_phone' ? 'bg-[#FDF3F3] border-[#E02424] text-[#9B1C1C]' : 'bg-[#F8FAFC] border-[#E4EAF2] text-[#5C6B82] hover:bg-[#EEF2F8]'}`}
                >
                  Mobile Phone
                </button>
                <button
                  onClick={() => setProctorCheckStatus("suspicious_activity")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${proctorCheckStatus === 'suspicious_activity' ? 'bg-[#FDF3F3] border-[#E02424] text-[#9B1C1C]' : 'bg-[#F8FAFC] border-[#E4EAF2] text-[#5C6B82] hover:bg-[#EEF2F8]'}`}
                >
                  Suspicious Activity
                </button>
              </div>
            </div>
          )}

          <div className="card pad bg-white border border-[#E4EAF2] rounded-xl p-5 shadow-sm" style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #E4EAF2', borderRadius: '12px' }}>
            <h3 className="font-display font-semibold text-sm text-[#0E1B2E] mb-1">Confirm System Readiness</h3>
            <p className="text-[12px] text-[#5C6B82] leading-relaxed mb-4">
              Upon clicking "Start Exam", fullscreen mode will be enabled and online proctoring begins. Camera, microphone and network access are required throughout the examination.
            </p>

            {((cameraAccess === 'denied' || micAccess === 'denied' || networkAccess === 'denied') || proctorCheckStatus !== 'normal') && (
              <div className="p-3.5 mb-4 rounded-xl bg-[#FDF3F3] border border-[#FCD9D9] text-[#9B1C1C] text-xs leading-relaxed flex gap-2.5 items-start">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <b className="font-semibold block mb-0.5">
                    {proctorCheckStatus !== 'normal'
                      ? 'AI Proctoring Violation'
                      : 'Permission/Connection Error'}
                  </b>
                  {proctorCheckStatus === 'multiple_faces' && 'Multiple faces detected in the camera feed. Please ensure you are alone in the room.'}
                  {proctorCheckStatus === 'mobile_phone' && 'Mobile phone detected in the camera feed. Please remove all mobile devices from your workspace.'}
                  {proctorCheckStatus === 'suspicious_activity' && 'Suspicious background/unauthorized activity detected in your camera feed. Please clear your workspace.'}
                  {proctorCheckStatus === 'normal' && (errorMessage || "Permissions or network stability validation failed. Please check your system settings.")}
                </div>
              </div>
            )}

            {renderActionButtons()}
          </div>
        </div>
      </div>
    </div>
  );
}
