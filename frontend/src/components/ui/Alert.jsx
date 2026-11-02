import { CircleAlert, CircleCheck, Info } from 'lucide-react';

const tones = {
  info: { box: 'border-sky bg-sky/10', icon: Info },
  success: { box: 'border-meadow bg-meadow/15', icon: CircleCheck },
  danger: { box: 'border-coral bg-coral/15', icon: CircleAlert },
};

export default function Alert({ tone = 'info', title, children }) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border-s-4 p-4 ${box}`}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-bold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}