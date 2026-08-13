import { useState, useEffect, useRef, useCallback } from 'react';
import { recordingService } from '../services/recordingService';

export function useRecording({ attemptId, active, streamRef, videoRef }) {
  const [recordingState, setRecordingState] = useState({
    recording: false,
    uploading: false,
    sessionId: null
  });

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Initialize camera and start MediaRecorder session
  useEffect(() => {
    if (!active || !attemptId) return;

    let isSubscribed = true;

    async function initSessionAndRecorder() {
      try {
        // 1. Call backend to start recording session
        const sessionRes = await recordingService.startSession(attemptId).catch(() => null);
        const sid = sessionRes && sessionRes.data ? sessionRes.data.sessionId : null;

        if (isSubscribed) {
          setRecordingState((prev) => ({ ...prev, sessionId: sid }));
        }

        // 2. Obtain video stream if not already active
        let stream = streamRef?.current;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 },
            audio: true
          });
          if (streamRef) streamRef.current = stream;
        }

        if (videoRef?.current) {
          videoRef.current.srcObject = stream;
        }

        // 3. Initialize MediaRecorder
        if (stream && window.MediaRecorder) {
          chunksRef.current = [];
          const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
          
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunksRef.current.push(e.data);
            }
          };

          recorder.start(1000); // Collect slice every 1 sec
          mediaRecorderRef.current = recorder;

          if (isSubscribed) {
            setRecordingState((prev) => ({ ...prev, recording: true }));
          }
        }
      } catch (err) {
        console.error('Failed to initialize video recording session:', err);
      }
    }

    initSessionAndRecorder();

    return () => {
      isSubscribed = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
      if (streamRef && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try { track.stop(); } catch (_) {}
        });
        streamRef.current = null;
      }
    };
  }, [attemptId, active, streamRef, videoRef]);

  // Stop recorder and upload recorded file
  const stopAndUploadRecording = useCallback(async (customAttemptId) => {
    const targetAttemptId = customAttemptId || attemptId;
    if (!targetAttemptId) return null;

    setRecordingState((prev) => ({ ...prev, uploading: true, recording: false }));

    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        recordingService
          .uploadRecording(blob, targetAttemptId, recordingState.sessionId)
          .then((res) => {
            setRecordingState((prev) => ({ ...prev, uploading: false }));
            resolve(res);
          })
          .catch((err) => {
            console.error('Upload recording failed:', err);
            setRecordingState((prev) => ({ ...prev, uploading: false }));
            resolve(null);
          });
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        try {
          const res = await recordingService.uploadRecording(blob, targetAttemptId, recordingState.sessionId);
          setRecordingState((prev) => ({ ...prev, uploading: false }));
          resolve(res);
        } catch (err) {
          console.error('Upload recording failed on stop:', err);
          setRecordingState((prev) => ({ ...prev, uploading: false }));
          resolve(null);
        }
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        setRecordingState((prev) => ({ ...prev, uploading: false }));
        resolve(null);
      }
    });
  }, [attemptId, recordingState.sessionId]);

  return {
    recording: recordingState.recording,
    uploading: recordingState.uploading,
    sessionId: recordingState.sessionId,
    stopAndUploadRecording
  };
}
