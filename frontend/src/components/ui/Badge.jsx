const tones = {
  neutral: 'bg-ink/10',
  info: 'bg-sky/15',
  success: 'bg-meadow/25',
  warning: 'bg-sun/40',
  danger: 'bg-coral/25',
};

export default function Badge({ tone = 'neutral', icon: Icon, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-ink ${tones[tone]}`}
    >
      {Icon && <Icon className="size-4" aria-hidden="true" />}
      {children}
    </span>
  );
}