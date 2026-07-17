import type { ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  feedbackId,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  feedbackId?: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="oriel-segmented"
      data-feedback={feedbackId}
      role="group"
    >
      {options.map((option) => (
        <button
          aria-label={option.label}
          aria-pressed={value === option.value}
          className="oriel-segmented-item"
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
