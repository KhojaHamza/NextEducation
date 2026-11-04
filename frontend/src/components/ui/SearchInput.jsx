import { useId } from 'react';
import { Search } from 'lucide-react';

export default function SearchInput({ label = 'Rechercher', value, onChange, placeholder, className = '' }) {
  const id = useId();

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute inset-y-0 start-4 my-auto size-5 text-ink/60"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-xl border-2 border-ink/15 bg-paper py-2 ps-12 pe-4 focus:border-sky"
      />
    </div>
  );
}