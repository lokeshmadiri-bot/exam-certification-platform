import { useEffect } from 'react';
import { useExam } from '../context/ExamContext';

export function useRecording() {
  const { loading, videoRef, streamRef } = useExam();

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 160, height: 120 }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera stream access failed:', err);
      }
    }

    if (!loading) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [loading, videoRef, streamRef]);

  const captureSnapshot = async () => {
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
        console.error('Canvas capture frame failed:', err);
        resolve(null);
      }
    });
  };

  return {
    videoRef,
    captureSnapshot
  };
}
