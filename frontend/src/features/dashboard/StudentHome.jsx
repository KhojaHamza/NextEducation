import { Link } from 'react-router-dom';
import { CalendarClock, FileText, Megaphone, UserX } from 'lucide-react';
import { useAuth } from '../auth/useAuth.js';
import { useAnnouncements } from '../announcements/hooks.js';

export default function StudentHome() {
  const { user } = useAuth();
  const announcements = useAnnouncements({ limit: 3 });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold">Bonjour {user.firstName} !</h1>
        <p className="mt-1 text-lg">Voici ton espace élève.</p>
      </header>

      <section aria-label="Accès rapide" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/eleve/emploi-du-temps" className="flex items-center gap-4 rounded-2xl bg-paper p-5 transition-shadow hover:shadow-md">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-sky/15"><CalendarClock className="size-7 text-sky" aria-hidden="true" /></span>
          <span><span className="block font-bold">Emploi du temps</span><span className="block text-sm text-ink/70">Consulte tes cours de la semaine.</span></span>
        </Link>
        <Link to="/eleve/absences" className="flex items-center gap-4 rounded-2xl bg-paper p-5 transition-shadow hover:shadow-md">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-sky/15"><UserX className="size-7 text-sky" aria-hidden="true" /></span>
          <span><span className="block font-bold">Absences</span><span className="block text-sm text-ink/70">Consulte tes absences.</span></span>
        </Link>
        <Link to="/eleve/bulletins" className="flex items-center gap-4 rounded-2xl bg-paper p-5 transition-shadow hover:shadow-md">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-sky/15"><FileText className="size-7 text-sky" aria-hidden="true" /></span>
          <span><span className="block font-bold">Bulletins</span><span className="block text-sm text-ink/70">Consulte tes bulletins.</span></span>
        </Link>
      </section>

      <section aria-label="Dernières annonces">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Dernières annonces</h2>
          <Link to="/annonces" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 font-bold text-sky hover:bg-sky/10"><Megaphone className="size-4" aria-hidden="true" /> Toutes les annonces</Link>
        </div>
        {announcements.isPending && <div role="status" aria-label="Chargement" className="h-24 animate-pulse rounded-2xl bg-ink/10" />}
        {announcements.isSuccess && (announcements.data?.data ?? []).length === 0 && <p className="text-ink/70">Aucune annonce pour le moment.</p>}
        {announcements.isSuccess && (announcements.data?.data ?? []).length > 0 && (
          <ul className="space-y-2">
            {announcements.data.data.map((a) => (
              <li key={a.id}><Link to="/annonces" className="block rounded-2xl bg-paper p-4 hover:shadow-md"><p className="font-bold">{a.title}</p><p className="mt-1 line-clamp-2 text-sm text-ink/80">{a.body}</p></Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}