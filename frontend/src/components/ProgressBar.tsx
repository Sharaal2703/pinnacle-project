import React from 'react';

interface ProgressBarProps {
  currentIndex: number;
  totalQuestions: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentIndex, totalQuestions }) => {
  const safeTotal = totalQuestions > 0 ? totalQuestions : 18;
  const progressPercent = Math.min(100, Math.round((currentIndex / safeTotal) * 100));

  return (
    <div className="progress-container" role="progressbar" aria-valuenow={currentIndex} aria-valuemin={1} aria-valuemax={safeTotal}>
      <div className="progress-info">
        <span>Question {currentIndex} of {safeTotal}</span>
        <span>{progressPercent}% Completed</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
};
