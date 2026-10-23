import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type SelectOption = { value: string | number; label: string; disabled?: boolean };
type SelectFieldProps = {
  id?: string;
  ariaLabel?: string;
  className?: string;
  value: string | number;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
};

export const SelectField: React.FC<SelectFieldProps> = ({ id, ariaLabel, className = '', value, options, onChange, disabled = false, required = false }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedValue = String(value);
  const selected = options.find(option => String(option.value) === selectedValue);
  const selectedIndex = Math.max(0, options.findIndex(option => String(option.value) === selectedValue));

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(String(option.value));
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveActive = (direction: number) => {
    let index = activeIndex;
    for (let tries = 0; tries < options.length; tries += 1) {
      index = (index + direction + options.length) % options.length;
      if (!options[index]?.disabled) { setActiveIndex(index); break; }
    }
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setActiveIndex(selectedIndex); setOpen(true); }
      else moveActive(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(options[activeIndex]);
      else { setActiveIndex(selectedIndex); setOpen(true); }
    } else if (event.key === 'Escape' && open) {
      event.preventDefault(); setOpen(false);
    } else if (event.key === 'Home' && open) {
      event.preventDefault(); setActiveIndex(0);
    } else if (event.key === 'End' && open) {
      event.preventDefault(); setActiveIndex(options.length - 1);
    }
  };

  return <div className={`select-field ${className}`.trim()} ref={rootRef}>
    <button
      ref={triggerRef}
      id={id}
      type="button"
      className="select-field-trigger"
      role="combobox"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={id ? `${id}-options` : undefined}
      aria-activedescendant={open && id ? `${id}-option-${activeIndex}` : undefined}
      aria-required={required || undefined}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={() => { if (!disabled) { setActiveIndex(selectedIndex); setOpen(v => !v); } }}
      onKeyDown={onTriggerKeyDown}
    >
      <span className={!selected || !selectedValue ? 'select-field-placeholder' : ''}>{selected?.label || 'Select an option'}</span>
      <ChevronDown size={18} aria-hidden="true" className={open ? 'select-field-chevron is-open' : 'select-field-chevron'} />
    </button>
    {open && <div className="select-field-menu" id={id ? `${id}-options` : undefined} role="listbox" aria-label={ariaLabel}>
      {options.map((option, index) => {
        const isSelected = String(option.value) === selectedValue;
        return <button
          key={String(option.value)}
          ref={node => { optionRefs.current[index] = node; }}
          id={id ? `${id}-option-${index}` : undefined}
          type="button"
          role="option"
          aria-selected={isSelected}
          disabled={option.disabled}
          className={`select-field-option${isSelected ? ' is-selected' : ''}${index === activeIndex ? ' is-active' : ''}`}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => choose(option)}
        >{option.label}</button>;
      })}
    </div>}
  </div>;
};
