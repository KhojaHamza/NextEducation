import { forwardRef, useId } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';

const SelectField = forwardRef(function SelectField(
  { label, hint, error, className = '', children, ...selectProps },
  ref,
) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-bold">
        {label}
      </label>
      {hint && !error && (
        <p id={`${id}-hint`} className="mb-1.5 text-sm text-ink/70">
          {hint}
        </p>
      )}
      <div className="relative">
        <select
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-h-11 w-full appearance-none rounded-xl border-2 bg-paper py-2 ps-4 pe-12 ${
            error ? 'border-coral' : 'border-ink/15 focus:border-sky'
          }`}
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute inset-y-0 end-4 my-auto size-5 text-ink/60"
          aria-hidden="true"
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 font-bold">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
});

export default SelectField;