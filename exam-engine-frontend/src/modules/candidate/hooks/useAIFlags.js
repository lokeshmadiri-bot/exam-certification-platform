import { useState, useCallback, useEffect } from 'react';
import { aiService } from '../services/aiService';

export function useAIFlags({ attemptId, active }) {
  const [aiFlags, setAiFlags] = useState([]);
  const [violationSummary, setViolationSummary] = useState(null);

  const recordSilentFlag = useCallback(async (flagType, confidence = 0.95, snapshotUrl = null) => {
    if (!attemptId) return;
    try {
      const res = await aiService.recordFlag(attemptId, flagType, confidence, snapshotUrl);
      if (res && res.data) {
        setAiFlags((prev) => [...prev, res.data]);
      }
    } catch (err) {
      console.error('Failed to record silent AI flag:', err);
    }
  }, [attemptId]);

  const fetchSummary = useCallback(async (customAttemptId) => {
    const targetAttemptId = customAttemptId || attemptId;
    if (!targetAttemptId) return null;

    try {
      const res = await aiService.getSummary(targetAttemptId);
      if (res && res.data) {
        setViolationSummary(res.data);
        return res.data;
      }
    } catch (err) {
      console.error('Failed to fetch proctoring violation summary:', err);
    }
    return null;
  }, [attemptId]);

  // Load existing flags on mount
  useEffect(() => {
    if (!active || !attemptId) return;

    async function loadFlags() {
      try {
        const res = await aiService.getFlags(attemptId);
        if (res && res.data && Array.isArray(res.data.flags)) {
          setAiFlags(res.data.flags);
        }
      } catch (e) {
        // Silently catch
      }
    }

    loadFlags();
  }, [attemptId, active]);

  return {
    aiFlags,
    violationSummary,
    recordSilentFlag,
    fetchSummary
  };
}
