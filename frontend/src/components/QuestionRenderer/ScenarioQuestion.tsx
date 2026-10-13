import React from 'react';
import type { SafeQuestionOption } from '@pinnacle/shared';

interface ScenarioQuestionProps {
  options: SafeQuestionOption[];
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  disabled?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const ScenarioQuestion: React.FC<ScenarioQuestionProps> = ({
  options,
  selectedOptionId,
  onSelectOption,
  disabled = false
}) => {
  return (
    <div className="scenario-options-list" role="radiogroup" aria-label="Scenario preference choices">
      {options.map((option, idx) => {
        const isSelected = selectedOptionId === option.id;
        const letter = OPTION_LETTERS[idx] || (idx + 1).toString();

        return (
          <div
            key={option.id}
            role="radio"
            aria-checked={isSelected}
            tabIndex={disabled ? -1 : 0}
            className={`scenario-option-card ${isSelected ? 'selected' : ''}`}
            onClick={() => !disabled && onSelectOption(option.id)}
            onKeyDown={(e) => {
              if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
                e.preventDefault();
                onSelectOption(option.id);
              }
            }}
          >
            <div className="option-badge">{letter}</div>
            <div className="option-text">{option.label}</div>
          </div>
        );
      })}
    </div>
  );
};
