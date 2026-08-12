import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useFaceDetection
 * ----------------
 * Uses face-api.js (loaded via CDN) to continuously scan a <video> element
 * for faces and report the count back to the caller.
 *
 * States returned:
 *   - modelReady     : boolean  — models have been loaded successfully
 *   - modelError     : string   — error message if model loading failed
 *   - faceCount      : number   — number of faces detected in the current frame
 *   - detectionStatus: string   — "loading" | "ready" | "detecting" | "error"
 *   - startDetection : fn(videoEl) — call once the video is playing to begin loop
 *   - stopDetection  : fn()     — call to stop the detection loop
 */

const MODELS_URL = '/models/tiny_face_detector';
const DETECTION_INTERVAL_MS = 1500; // run detection every 1.5 s

export function useFaceDetection() {
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [faceCount, setFaceCount] = useState(0);
  const [detectionStatus, setDetectionStatus] = useState('loading');

  const intervalRef = useRef(null);
  const videoElRef = useRef(null);
  const mountedRef = useRef(true);

  // Load models once on mount
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function loadModels() {
      try {
        const faceapi = window.faceapi;
        if (!faceapi) {
          throw new Error('face-api.js is not loaded. Check the CDN script in index.html.');
        }

        console.log('[FaceDetection] Loading face detection models from local /models/…');
        setDetectionStatus('loading');

        // TinyFaceDetector is very fast and lightweight (< 190 KB weights)
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        ]);

        if (!cancelled && mountedRef.current) {
          console.log('[FaceDetection] Models loaded successfully');
          setModelReady(true);
          setDetectionStatus('ready');
        }
      } catch (err) {
        console.error('[FaceDetection] Failed to load models:', err);
        if (!cancelled && mountedRef.current) {
          setModelError(err.message || 'Failed to load face detection models');
          setDetectionStatus('error');
        }
      }
    }

    loadModels();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const runDetection = useCallback(async () => {
    const faceapi = window.faceapi;
    const videoEl = videoElRef.current;

    if (!faceapi || !videoEl || !modelReady) return;
    if (videoEl.readyState < 2 || videoEl.paused || videoEl.ended) return;

    try {
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
      const detections = await faceapi.detectAllFaces(videoEl, options);

      if (mountedRef.current) {
        const count = detections ? detections.length : 0;
        console.log(`[FaceDetection] Detected ${count} face(s)`);
        setFaceCount(count);
        setDetectionStatus('detecting');
      }
    } catch (err) {
      console.warn('[FaceDetection] Detection frame error (ignored):', err.message);
    }
  }, [modelReady]);

  const startDetection = useCallback((videoEl) => {
    if (!videoEl) return;
    videoElRef.current = videoEl;

    // Clear any existing loop
    if (intervalRef.current) clearInterval(intervalRef.current);

    console.log('[FaceDetection] Starting detection loop');
    // Run immediately then on interval
    runDetection();
    intervalRef.current = setInterval(runDetection, DETECTION_INTERVAL_MS);
  }, [runDetection]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[FaceDetection] Detection loop stopped');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    modelReady,
    modelError,
    faceCount,
    detectionStatus,
    startDetection,
    stopDetection,
  };
}
