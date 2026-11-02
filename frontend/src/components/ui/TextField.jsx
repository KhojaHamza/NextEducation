import { forwardRef, useId } from 'react';
import { CircleAlert } from 'lucide-react';

const TextField = forwardRef(function TextField(
  { label, hint, error, className = '', ...inputProps },
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
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-11 w-full rounded-xl border-2 bg-paper px-4 py-2 ${
          error ? 'border-coral' : 'border-ink/15 focus:border-sky'
        }`}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 font-bold">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
});

export default TextField;