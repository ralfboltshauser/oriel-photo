import * as Slider from '@radix-ui/react-slider';
import { useId, useState } from 'react';

export interface SliderFieldProps {
  feedbackId?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  onReset?: () => void;
}

export function SliderField({
  feedbackId,
  label,
  value,
  min,
  max,
  step = 1,
  formatValue = (next) => (next > 0 ? `+${next}` : String(next)),
  onChange,
  onCommit,
  onReset,
}: SliderFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      onCommit?.(clamped);
    }
    setDraft(null);
  };

  return (
    <div
      className="oriel-slider-field"
      data-feedback={feedbackId}
      data-testid={`slider-${label.toLowerCase()}`}
    >
      <div className="oriel-slider-header">
        <label className="oriel-slider-label" htmlFor={id} onDoubleClick={onReset}>
          {label}
        </label>
        <input
          aria-label={`${label} value`}
          className="oriel-slider-value"
          id={id}
          inputMode="decimal"
          onBlur={commitDraft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              setDraft(null);
              event.currentTarget.blur();
            }
          }}
          value={draft ?? formatValue(value)}
        />
      </div>
      <Slider.Root
        aria-label={label}
        className="oriel-slider-root"
        max={max}
        min={min}
        onValueChange={([next = value]) => onChange(next)}
        onValueCommit={([next = value]) => onCommit?.(next)}
        step={step}
        value={[value]}
      >
        <Slider.Track className="oriel-slider-track">
          <Slider.Range className="oriel-slider-range" />
        </Slider.Track>
        <Slider.Thumb aria-label={label} className="oriel-slider-thumb" />
      </Slider.Root>
    </div>
  );
}
