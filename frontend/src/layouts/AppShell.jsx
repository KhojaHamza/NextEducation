import { LogOut } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { navigationFor } from '../app/navigation.js';
import { useAuth } from '../features/auth/useAuth.js';

const roleLabels = {
  ADMIN: 'Administration',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
  STUDENT: 'Élève',
  ACCOUNTANT: 'Comptabilité',
};

// Desktop menu: the active page is shown by a colored bar AND a stronger background, not by color alone
const sideLink = ({ isActive }) =>
  `flex min-h-11 items-center gap-3 rounded-xl border-s-4 px-4 font-bold ${
    isActive ? 'border-sky bg-sky/15' : 'border-transparent hover:bg-ink/5'
  }`;

// Phone tab bar: it scrolls sideways when there are many pages, each tab keeps a readable width
const tabLink = ({ isActive }) =>
  `flex min-h-14 min-w-24 flex-1 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-sm font-bold ${
    isActive ? 'bg-sky/15' : ''
  }`;

export default function AppShell() {
  const { user, logout } = useAuth();
  const items = navigationFor(user.role);
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Lets keyboard users jump over the menu */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-xl focus:bg-paper focus:px-4 focus:py-2 focus:font-bold"
      >
        Aller au contenu
      </a>

      {/* Desktop: menu on the side */}
      <aside className="hidden border-e border-ink/10 bg-paper p-5 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-6">
        <p className="font-display text-2xl font-semibold">NextEducation</p>

        <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to.split('/').length <= 2} className={sideLink}>
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-full bg-sun font-display text-lg font-semibold"
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{user.firstName} {user.lastName}</p>
            <p className="text-sm">{roleLabels[user.role]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-11 items-center gap-3 rounded-xl px-4 font-bold hover:bg-ink/5"
        >
          <LogOut className="size-5" aria-hidden="true" />
          Se déconnecter
        </button>
      </aside>

      <div className="min-w-0">
        {/* Phone: small top bar */}
        <header className="flex items-center justify-between border-b border-ink/10 bg-paper px-4 py-2 lg:hidden">
          <p className="font-display text-xl font-semibold">NextEducation</p>
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            className="grid size-11 place-items-center rounded-xl hover:bg-ink/5"
          >
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </header>

        <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-5xl p-6 pb-28 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Phone: tab bar at the bottom, easy to reach with a thumb */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-ink/10 bg-paper px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to.split('/').length <= 2} className={tabLink}>
            <Icon className="size-6" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}