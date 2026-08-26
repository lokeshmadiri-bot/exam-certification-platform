import { useState, useEffect } from 'react';
import { useIntegrity } from '../context/IntegrityContext';

export function useWatermark() {
  const { watermark } = useIntegrity();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const watermarkText = watermark.watermarkEnabled
    ? `${watermark.candidateName}· ${watermark.examName} · ${timeStr} `
    : '';

  return {
    watermarkEnabled: watermark.watermarkEnabled,
    watermarkText
  };
}
