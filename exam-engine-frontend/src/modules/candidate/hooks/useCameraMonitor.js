import { useEffect, useRef, useCallback } from 'react';
import { useFaceDetection } from './useFaceDetection';
import { aiService } from '../services/aiService';

/**
 * useCameraMonitor
 * ----------------
 * Continuously monitors the live exam camera feed using face-api.js detection.
 * Triggers proctoring violations through the existing useStrikeEngine + useAIFlags
 * infrastructure — same rules as the pre-exam SystemCheck camera validation.
 *
 * Violation rules:
 *   - MULTIPLE_FACES : faceCount >= 2 → immediate violation (debounced by useStrikeEngine's 10s cooldown)
 *   - FACE_NOT_DETECTED : faceCount === 0 continuously for 30 seconds → violation
 *     (timer resets if face reappears before 30s)
 *
 * @param {object} props
 * @param {React.RefObject} props.videoRef         - ref to the <video> element in the sidebar PIP
 * @param {boolean}         props.active            - only monitor when exam is live & proctoring is active
 * @param {Function}        props.handleViolation   - from useStrikeEngine
 * @param {Function}        props.recordSilentFlag  - from useAIFlags
 */
export function useCameraMonitor({ videoRef, active, handleViolation, recordSilentFlag, attemptId }) {
  const { modelReady, faceCount, startDetection, stopDetection } = useFaceDetection();

  // ── Snapshot helper ────────────────────────────────────────────────────────
  // Captures a JPEG from the live video element, uploads to MinIO, returns URL.
  // Non-blocking: resolves to null on any failure.
  const captureAndUploadSnapshot = useCallback(async () => {
    if (!videoRef?.current || !attemptId) return null;
    try {
      const video = videoRef.current;
      if (video.readyState < 2 || video.videoWidth === 0) return null;

      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 320, 240);

      // Convert to JPEG blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.75));
      if (!blob) return null;

      const res = await aiService.uploadSnapshot(attemptId, blob);
      return res?.data?.snapshotUrl || null;
    } catch (err) {
      console.warn('[CameraMonitor] Snapshot upload failed (non-critical):', err.message);
      return null;
    }
  }, [videoRef, attemptId]);

  // Track whether detection has been started
  const detectionStartedRef = useRef(false);

  // Face-absent 30-second timer
  const absentTimerRef = useRef(null);
  const absentTriggeredRef = useRef(false); // prevent repeated triggers during same continuous absence

  // Multiple-faces state — track previous count to avoid re-triggering within the same event
  const prevFaceCountRef = useRef(null);

  // Clear the 30-second absence timer
  const clearAbsentTimer = useCallback(() => {
    if (absentTimerRef.current) {
      clearTimeout(absentTimerRef.current);
      absentTimerRef.current = null;
    }
  }, []);

  // Start / stop detection loop based on active flag and model readiness
  useEffect(() => {
    if (!active) {
      // Stop everything when exam is not active
      stopDetection();
      detectionStartedRef.current = false;
      clearAbsentTimer();
      absentTriggeredRef.current = false;
      prevFaceCountRef.current = null;
      return;
    }

    if (modelReady && videoRef?.current && !detectionStartedRef.current) {
      // Wait a short moment for the video element to be fully playing before starting detection
      const startTimer = setTimeout(() => {
        if (videoRef.current && active) {
          console.log('[CameraMonitor] Starting continuous face detection');
          startDetection(videoRef.current);
          detectionStartedRef.current = true;
        }
      }, 2000);

      return () => clearTimeout(startTimer);
    }
  }, [active, modelReady, videoRef, startDetection, stopDetection, clearAbsentTimer]);

  // React to faceCount changes — apply the violation rules
  useEffect(() => {
    if (!active || !modelReady) return;

    // ── Rule 1: Multiple Faces ────────────────────────────────────────────────
    if (faceCount >= 2) {
      // Cancel absence timer (face IS visible, just multiple)
      clearAbsentTimer();
      absentTriggeredRef.current = false;

      // Only trigger once per "entry" into multiple-faces state (not every detection tick)
      if (prevFaceCountRef.current < 2) {
        console.log(`[CameraMonitor] Multiple faces detected (${faceCount}) — triggering violation`);
        // Capture snapshot asynchronously, then record the flag with it
        captureAndUploadSnapshot().then(snapshotUrl => {
          recordSilentFlag('MULTIPLE_FACES', 0.95, snapshotUrl);
        });
        handleViolation('MULTIPLE_FACES');
      }
    }

    // ── Rule 2: Face Not Detected (30-second debounce) ────────────────────────
    else if (faceCount === 0) {
      // No absence timer running yet — start the 30s countdown
      if (!absentTimerRef.current && !absentTriggeredRef.current) {
        console.log('[CameraMonitor] Face not detected — starting 30-second absence timer');
        absentTimerRef.current = setTimeout(() => {
          console.log('[CameraMonitor] 30 seconds without face — triggering FACE_NOT_DETECTED violation');
          absentTriggeredRef.current = true;
          absentTimerRef.current = null;
          // Capture snapshot asynchronously, then record the flag with it
          captureAndUploadSnapshot().then(snapshotUrl => {
            recordSilentFlag('FACE_NOT_DETECTED', 0.95, snapshotUrl);
          });
          handleViolation('FACE_NOT_DETECTED');
        }, 30000);
      }
    }

    // ── Rule 3: Single Face (Normal) ──────────────────────────────────────────
    else if (faceCount === 1) {
      // Face is back — cancel the absence timer and allow it to trigger again next time
      if (absentTimerRef.current) {
        console.log('[CameraMonitor] Face reappeared — cancelling absence timer');
        clearAbsentTimer();
      }
      // Reset the "triggered" flag so next continuous absence can trigger again
      absentTriggeredRef.current = false;
    }

    // Track previous count for multiple-faces edge detection
    prevFaceCountRef.current = faceCount;
  }, [faceCount, active, modelReady, handleViolation, recordSilentFlag, clearAbsentTimer, captureAndUploadSnapshot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
      clearAbsentTimer();
    };
  }, [stopDetection, clearAbsentTimer]);
}
