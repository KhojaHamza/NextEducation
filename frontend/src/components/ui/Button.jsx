import { LoaderCircle } from 'lucide-react';

const variants = {
  primary: 'bg-sky text-white hover:bg-sky/90',
  secondary: 'border-2 border-ink/15 bg-paper text-ink hover:border-ink/40',
  danger: 'bg-coral text-ink hover:bg-coral/90',
  ghost: 'text-sky hover:bg-sky/10',
};

export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}