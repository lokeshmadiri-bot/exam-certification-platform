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
  // Keep sessionId in a ref so stopAndUploadRecording never reads a stale closure value
  const sessionIdRef = useRef(null);

  // Initialize camera and start MediaRecorder session
  useEffect(() => {
    if (!active || !attemptId) return;

    let isSubscribed = true;

    async function initSessionAndRecorder() {
      try {
        // 1. Call backend to start recording session
        const sessionRes = await recordingService.startSession(attemptId).catch((err) => {
          console.warn('[Recording] startSession failed:', err?.message);
          return null;
        });
        const sid = sessionRes && sessionRes.data ? sessionRes.data.sessionId : null;
        console.log('[Recording] Session started, sessionId =', sid);

        if (isSubscribed) {
          sessionIdRef.current = sid;
          setRecordingState((prev) => ({ ...prev, sessionId: sid }));
        }

        // 2. Obtain video stream if not already active
        let stream = streamRef?.current;
        if (!(stream instanceof MediaStream)) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: 320, height: 240 },
              audio: true
            });
            if (streamRef) streamRef.current = stream;
          } catch (mediaErr) {
            console.warn('[Recording] getUserMedia failed, skipping recorder setup:', mediaErr.message);
            stream = null;
          }
        }

        if (stream && stream instanceof MediaStream && videoRef?.current) {
          videoRef.current.srcObject = stream;
        }

        // 3. Initialize MediaRecorder
        if (stream && stream instanceof MediaStream && window.MediaRecorder) {
          chunksRef.current = [];

          // Pick a supported mimeType
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
            ? 'video/webm;codecs=vp8,opus'
            : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : '';

          const recorderOptions = mimeType ? { mimeType } : {};
          const recorder = new MediaRecorder(stream, recorderOptions);

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunksRef.current.push(e.data);
              console.log('[Recording] Chunk collected, size =', e.data.size, 'total chunks =', chunksRef.current.length);
            }
          };

          recorder.onerror = (e) => {
            console.error('[Recording] MediaRecorder error:', e);
          };

          recorder.start(1000); // Collect slice every 1 sec
          mediaRecorderRef.current = recorder;
          console.log('[Recording] MediaRecorder started with mimeType:', mimeType || '(default)');

          if (isSubscribed) {
            setRecordingState((prev) => ({ ...prev, recording: true }));
          }
        } else {
          console.warn('[Recording] MediaRecorder not available or stream not ready');
        }
      } catch (err) {
        console.error('[Recording] Failed to initialize recording session:', err);
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

  /**
   * Stop recorder, collect all chunks, upload to backend.
   * Returns a Promise that resolves when upload completes (or after a timeout).
   * MUST be awaited by the caller before submitting the exam.
   */
  const stopAndUploadRecording = useCallback(async (customAttemptId) => {
    const targetAttemptId = customAttemptId || attemptId;
    if (!targetAttemptId) {
      console.warn('[Recording] stopAndUploadRecording: no attemptId, skipping');
      return null;
    }

    // Read sessionId from ref (avoids stale closure)
    const sid = sessionIdRef.current;
    console.log('[Recording] stopAndUploadRecording called, attemptId =', targetAttemptId, 'sessionId =', sid);

    setRecordingState((prev) => ({ ...prev, uploading: true, recording: false }));

    // Helper: upload whatever chunks we have right now
    const doUpload = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      console.log('[Recording] Uploading blob, size =', blob.size, 'bytes, chunks =', chunksRef.current.length);

      if (blob.size === 0) {
        console.warn('[Recording] Upload skipped: blob is empty (no chunks collected)');
        setRecordingState((prev) => ({ ...prev, uploading: false }));
        return null;
      }

      try {
        const res = await recordingService.uploadRecording(blob, targetAttemptId, sid);
        console.log('[Recording] Upload SUCCESS:', res);
        setRecordingState((prev) => ({ ...prev, uploading: false }));
        return res;
      } catch (err) {
        console.error('[Recording] Upload FAILED:', err);
        setRecordingState((prev) => ({ ...prev, uploading: false }));
        return null;
      }
    };

    // If recorder is already inactive, upload immediately
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      console.log('[Recording] Recorder already inactive, uploading existing chunks');
      return doUpload();
    }

    // Stop recorder and wait for the onstop callback, with a 12-second safety timeout
    return new Promise((resolve) => {
      const TIMEOUT_MS = 12000;

      const timeoutId = setTimeout(() => {
        console.warn('[Recording] onstop timeout after', TIMEOUT_MS, 'ms — uploading available chunks anyway');
        doUpload().then(resolve);
      }, TIMEOUT_MS);

      mediaRecorderRef.current.onstop = async () => {
        clearTimeout(timeoutId);
        console.log('[Recording] MediaRecorder stopped, uploading…');
        const result = await doUpload();
        resolve(result);
      };

      try {
        mediaRecorderRef.current.stop();
        console.log('[Recording] MediaRecorder.stop() called');
      } catch (e) {
        clearTimeout(timeoutId);
        console.error('[Recording] Error calling MediaRecorder.stop():', e);
        doUpload().then(resolve);
      }
    });
  }, [attemptId]);

  return {
    recording: recordingState.recording,
    uploading: recordingState.uploading,
    sessionId: recordingState.sessionId,
    stopAndUploadRecording
  };
}
