import { Link } from 'react-router-dom';
import { CalendarClock, ClipboardCheck, ClipboardList, Megaphone, School, MessageCircle } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../auth/useAuth.js';
import { useAnnouncements } from '../announcements/hooks.js';
import { useMyClasses } from '../evaluations/hooks.js';
import { useUnreadCount } from '../messages/hooks.js';
import { classLabel } from '../students/format.js';

export default function TeacherHome() {
  const { user } = useAuth();
  const mine = useMyClasses();
  const announcements = useAnnouncements({ limit: 3 });
  const unreadMessages = useUnreadCount();

  const all = mine.data ?? [];
  const current = all.filter((c) => c.schoolYear?.isCurrent);
  const classes = current.length ? current : all;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold">Bonjour {user.firstName} !</h1>
        <p className="mt-1 text-lg">Voici ton espace enseignant pour aujourd'hui.</p>
      </header>

      {/* Actions rapides */}
      <section aria-label="Actions rapides" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/enseignant/appel" className="flex items-center gap-4 rounded-2xl bg-paper p-5 transition-shadow hover:shadow-md">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-sun/50">
            <ClipboardCheck className="size-7 text-ink" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-bold">Faire l'appel</span>
            <span className="block text-sm text-ink/70">Saisir les absences du jour.</span>
          </span>
        </Link>

        <Link to="/enseignant/emploi-du-temps" className="flex items-center gap-4 rounded-2xl bg-paper p-5 transition-shadow hover:shadow-md">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-sky/15">
            <CalendarClock className="size-7 text-sky" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-bold">Mon emploi du temps</span>
            <span className="block text-sm text-ink/70">Consulter tes cours de la semaine.</span>
          </span>
        </Link>

        <Link to="/messages" className="flex items-center gap-4 rounded-2xl bg-paper p-5 transition-shadow hover:shadow-md relative">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-meadow/20">
            <MessageCircle className="size-7 text-meadow" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-bold">Messages</span>
            <span className="block text-sm text-ink/70">Discuter avec les parents et l'administration.</span>
          </span>
          {unreadMessages.data > 0 && (
            <span className="absolute top-4 right-4 grid size-6 place-items-center rounded-full bg-coral text-xs font-bold text-ink">
              {unreadMessages.data}
            </span>
          )}
        </Link>
      </section>

      {/* Mes classes */}
      <section aria-label="Mes classes">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Mes classes</h2>
          <Link
            to="/enseignant/evaluations"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-ink/15 bg-paper px-5 font-bold text-ink hover:border-ink/40"
          >
            <ClipboardList className="size-4" aria-hidden="true" />
            Saisir des notes
          </Link>
        </div>

        {mine.isPending ? (
          <div role="status" aria-label="Chargement des classes" className="h-32 animate-pulse rounded-2xl bg-ink/10" />
        ) : mine.error ? (
          <Alert tone="danger" title="Impossible de charger tes classes">
            <p>{mine.error.message}</p>
            <Button variant="secondary" onClick={() => mine.refetch()} className="mt-3">Réessayer</Button>
          </Alert>
        ) : classes.length === 0 ? (
          <EmptyState icon={School} title="Aucune classe attribuée">
            L’administration doit t’attribuer une classe ou une matière avant que tu puisses saisir des notes.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <li key={c.id} className="rounded-2xl bg-paper p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-2xl font-semibold">{classLabel(c)}</p>
                  {c.homeroom && <Badge tone="success">Titulaire</Badge>}
                </div>
                <p className="mt-1 text-sm text-ink/70">{c.schoolYear?.label}</p>
                {c.subjects.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {c.subjects.map((s) => (
                      <li key={s.id}><Badge tone="info">{s.name}</Badge></li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-ink/70">Aucune matière attribuée.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Dernières annonces */}
      <section aria-label="Dernières annonces">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Dernières annonces</h2>
          <Link to="/annonces" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 font-bold text-sky hover:bg-sky/10">
            <Megaphone className="size-4" aria-hidden="true" /> Toutes les annonces
          </Link>
        </div>
        
        {announcements.isPending && <div role="status" aria-label="Chargement" className="h-24 animate-pulse rounded-2xl bg-ink/10" />}
        
        {announcements.isSuccess && (announcements.data?.data ?? []).length === 0 && (
          <p className="text-ink/70">Aucune annonce pour le moment.</p>
        )}
        
        {announcements.isSuccess && (announcements.data?.data ?? []).length > 0 && (
          <ul className="space-y-2">
            {announcements.data.data.map((a) => (
              <li key={a.id}>
                <Link to="/annonces" className="block rounded-2xl bg-paper p-4 hover:shadow-md">
                  <p className="font-bold">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/80">{a.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}