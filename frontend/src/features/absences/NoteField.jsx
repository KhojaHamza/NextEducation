import { useId } from 'react';

// A labelled multi-line field
export default function NoteField({ label, hint, error, value, onChange, maxLength, rows = 3 }) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-bold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mb-1 text-sm text-ink/70">
          {hint}
        </p>
      )}
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded-xl border-2 border-ink/15 bg-paper px-4 py-2 focus:border-sky"
      />
      {error && (
        <p role="alert" className="mt-1 font-bold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}