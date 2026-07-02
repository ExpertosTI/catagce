'use client';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
};

export function SegmentedControl<T extends string>({ value, onChange, options }: Props<T>) {
  return (
    <div className="segmented-control" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`segmented-option ${value === opt.value ? 'segmented-option-active' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
