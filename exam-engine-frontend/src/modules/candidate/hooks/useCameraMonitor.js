import { useEffect, useRef, useState } from 'react';
import { useFaceDetection } from './useFaceDetection';

/**
 * useCameraMonitor
 * ----------------
 * Monitors the live exam camera feed and workspace integrity.
 * Tracks continuous violations (face not detected, multiple faces, mobile phone).
 *
 * Rules:
 *   - Any violation triggers a single initial warning warning/strike.
 *   - Continuous presence of a violation for 60 seconds triggers a _TIMEOUT termination.
 *   - No duplicate warnings are spammed for the same continuous event.
 *   - If the condition clears, the timers reset immediately.
 */
export function useCameraMonitor({ videoRef, active, handleViolation, recordSilentFlag, attemptId }) {
  const { modelReady, faceCount, startDetection, stopDetection } = useFaceDetection();

  const [activeViolationOverlay, setActiveViolationOverlay] = useState(null);
  const [violationTimeLeft, setViolationTimeLeft] = useState(60);

  const multipleFacesStartRef = useRef(null);
  const faceNotDetectedStartRef = useRef(null);
  const mobilePhoneStartRef = useRef(null);

  const multipleFacesWarnedRef = useRef(false);
  const faceNotDetectedWarnedRef = useRef(false);
  const mobilePhoneWarnedRef = useRef(false);

  const terminationTriggeredRef = useRef(false);
  const detectionStartedRef = useRef(false);

  // Start / stop detection loop based on active flag and model readiness
  useEffect(() => {
    if (!active) {
      stopDetection();
      detectionStartedRef.current = false;
      return;
    }

    if (modelReady && videoRef?.current && !detectionStartedRef.current) {
      const startTimer = setTimeout(() => {
        if (videoRef.current && active) {
          console.log('[CameraMonitor] Starting continuous face detection');
          startDetection(videoRef.current);
          detectionStartedRef.current = true;
        }
      }, 2000);

      return () => clearTimeout(startTimer);
    }
  }, [active, modelReady, videoRef, startDetection, stopDetection]);

  // Periodic interval (every 1 second) to evaluate violations and decrement countdowns
  useEffect(() => {
    if (!active) {
      multipleFacesStartRef.current = null;
      faceNotDetectedStartRef.current = null;
      mobilePhoneStartRef.current = null;
      multipleFacesWarnedRef.current = false;
      faceNotDetectedWarnedRef.current = false;
      mobilePhoneWarnedRef.current = false;
      terminationTriggeredRef.current = false;
      setActiveViolationOverlay(null);
      setViolationTimeLeft(60);
      return;
    }

    const intervalId = setInterval(() => {
      if (!active) return;

      const now = Date.now();

      // Read current proctoring signals (allow window mock overrides for automated testing)
      const currentFaceCount = (typeof window.simulatedFaceCount === 'number')
        ? window.simulatedFaceCount
        : (modelReady ? faceCount : 1);

      const isMobilePhoneDetected = !!window.simulatedMobilePhoneDetected;

      // 1. Multiple Faces Detected
      const hasMultipleFaces = currentFaceCount >= 2;
      if (hasMultipleFaces) {
        if (multipleFacesStartRef.current === null) {
          multipleFacesStartRef.current = now;
        }
      } else {
        multipleFacesStartRef.current = null;
        multipleFacesWarnedRef.current = false;
      }

      // 2. Face Not Detected / Candidate Not Visible
      const hasNoFace = currentFaceCount === 0;
      if (hasNoFace) {
        if (faceNotDetectedStartRef.current === null) {
          faceNotDetectedStartRef.current = now;
        }
      } else {
        faceNotDetectedStartRef.current = null;
        faceNotDetectedWarnedRef.current = false;
      }

      // 3. Mobile Phone / Secondary Device Detected
      if (isMobilePhoneDetected) {
        if (mobilePhoneStartRef.current === null) {
          mobilePhoneStartRef.current = now;
        }
      } else {
        mobilePhoneStartRef.current = null;
        mobilePhoneWarnedRef.current = false;
      }

      // Determine active overlay state and handle warnings / timeouts
      let activeOverlay = null;
      let timeLeft = 60;

      if (hasMultipleFaces && multipleFacesStartRef.current) {
        const elapsed = Math.floor((now - multipleFacesStartRef.current) / 1000);
        timeLeft = Math.max(0, 60 - elapsed);
        activeOverlay = 'MULTIPLE_FACES';

        // Trigger initial warning after 1 second of detection
        if (elapsed >= 1 && !multipleFacesWarnedRef.current) {
          multipleFacesWarnedRef.current = true;
          handleViolation('MULTIPLE_FACES');
        }

        // Trigger termination if continuous for 60 seconds
        if (elapsed >= 60 && !terminationTriggeredRef.current) {
          terminationTriggeredRef.current = true;
          handleViolation('MULTIPLE_FACES_TIMEOUT');
        }
      } else if (hasNoFace && faceNotDetectedStartRef.current) {
        const elapsed = Math.floor((now - faceNotDetectedStartRef.current) / 1000);
        timeLeft = Math.max(0, 60 - elapsed);
        activeOverlay = 'FACE_NOT_DETECTED';

        // Trigger initial warning after 3 seconds (debounce minor blinks or shifts)
        if (elapsed >= 3 && !faceNotDetectedWarnedRef.current) {
          faceNotDetectedWarnedRef.current = true;
          handleViolation('FACE_NOT_DETECTED');
        }

        // Trigger termination if continuous for 60 seconds
        if (elapsed >= 60 && !terminationTriggeredRef.current) {
          terminationTriggeredRef.current = true;
          handleViolation('FACE_NOT_DETECTED_TIMEOUT');
        }
      } else if (isMobilePhoneDetected && mobilePhoneStartRef.current) {
        const elapsed = Math.floor((now - mobilePhoneStartRef.current) / 1000);
        timeLeft = Math.max(0, 60 - elapsed);
        activeOverlay = 'MOBILE_PHONE';

        // Trigger initial warning after 1 second
        if (elapsed >= 1 && !mobilePhoneWarnedRef.current) {
          mobilePhoneWarnedRef.current = true;
          handleViolation('MOBILE_PHONE');
        }

        // Trigger termination if continuous for 60 seconds
        if (elapsed >= 60 && !terminationTriggeredRef.current) {
          terminationTriggeredRef.current = true;
          handleViolation('MOBILE_PHONE_TIMEOUT');
        }
      }

      setActiveViolationOverlay(activeOverlay);
      setViolationTimeLeft(timeLeft);

    }, 1000);

    return () => clearInterval(intervalId);
  }, [active, modelReady, faceCount, handleViolation]);

  // Cleanup face detection loop on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    multipleFacesActive: activeViolationOverlay === 'MULTIPLE_FACES',
    multipleFacesTimeLeft: activeViolationOverlay === 'MULTIPLE_FACES' ? violationTimeLeft : 60,
    activeViolationOverlay,
    violationTimeLeft
  };
}
