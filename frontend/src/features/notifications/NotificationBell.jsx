import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotificationsUnreadCount } from './hooks.js';

export default function NotificationBell({ className = '' }) {
  const unread = useNotificationsUnreadCount();
  const count = unread.data ?? 0;
  return (
    <Link
      to="/notifications"
      aria-label={count > 0 ? `${count} nouvelle${count > 1 ? 's' : ''} notification${count > 1 ? 's' : ''}` : 'Notifications'}
      className={`relative grid size-11 place-items-center rounded-xl hover:bg-ink/5 ${className}`}
    >
      <Bell className="size-5" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-xs font-bold">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}