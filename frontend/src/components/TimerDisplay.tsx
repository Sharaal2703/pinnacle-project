import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerDisplayProps {
  questionRemainingSec: number;
  assessmentRemainingSec: number;
  onQuestionTimeout?: () => void;
  onAssessmentTimeout?: () => void;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  questionRemainingSec,
  assessmentRemainingSec,
  onQuestionTimeout,
  onAssessmentTimeout
}) => {
  const [qSec, setQSec] = useState<number>(questionRemainingSec);
  const [aSec, setASec] = useState<number>(assessmentRemainingSec);

  // Sync state when props change (e.g. Next question loaded)
  useEffect(() => {
    setQSec(questionRemainingSec);
  }, [questionRemainingSec]);

  useEffect(() => {
    setASec(assessmentRemainingSec);
  }, [assessmentRemainingSec]);

  const onQuestionTimeoutRef = useRef(onQuestionTimeout);
  onQuestionTimeoutRef.current = onQuestionTimeout;

  const onAssessmentTimeoutRef = useRef(onAssessmentTimeout);
  onAssessmentTimeoutRef.current = onAssessmentTimeout;

  useEffect(() => {
    const interval = setInterval(() => {
      setQSec((prev) => {
        if (prev <= 1) {
          onQuestionTimeoutRef.current?.();
          return 0;
        }
        return prev - 1;
      });

      setASec((prev) => {
        if (prev <= 1) {
          onAssessmentTimeoutRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isQWarning = qSec <= 15 && qSec > 5;
  const isQCritical = qSec <= 5;
  const isACritical = aSec <= 120; // 2 minutes remaining on total assessment

  return (
    <div className="timer-bar" aria-label="Assessment Timers">
      <div
        className={`timer-box ${isQCritical ? 'danger' : isQWarning ? 'warning' : ''}`}
        title="Time remaining for this question"
      >
        {isQCritical ? <AlertTriangle size={18} /> : <Clock size={18} />}
        <span>Question Time: {formatTime(qSec)}</span>
      </div>

      <div
        className={`timer-box ${isACritical ? 'danger' : ''}`}
        title="Total remaining assessment time"
      >
        <Clock size={18} />
        <span>Total Test Time: {formatTime(aSec)}</span>
      </div>
    </div>
  );
};
