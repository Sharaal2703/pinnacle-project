import React from 'react';

interface LikertQuestionProps {
  ratingScale?: number[];
  selectedRating: number | null;
  onSelectRating: (rating: number) => void;
  disabled?: boolean;
}

const SCALE_LABELS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '🙁', label: 'Strongly Disagree' },
  2: { emoji: '🙁', label: 'Disagree' },
  3: { emoji: '😐', label: 'Neutral / Sometimes' },
  4: { emoji: '🙂', label: 'Agree' },
  5: { emoji: '🤩', label: 'Strongly Agree' }
};

export const LikertQuestion: React.FC<LikertQuestionProps> = ({
  ratingScale = [1, 2, 3, 4, 5],
  selectedRating,
  onSelectRating,
  disabled = false
}) => {
  return (
    <div className="likert-grid" role="radiogroup" aria-label="5-point preference rating scale">
      {ratingScale.map((rating) => {
        const item = SCALE_LABELS[rating] || { emoji: '⭐', label: `Rating ${rating}` };
        const isSelected = selectedRating === rating;

        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            className={`likert-btn ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectRating(rating)}
          >
            <span className="likert-emoji" aria-hidden="true">{item.emoji}</span>
            <span className="likert-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
