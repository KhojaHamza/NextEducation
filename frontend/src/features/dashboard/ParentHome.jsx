import { Link } from 'react-router-dom';
import { CalendarClock, FileText, Megaphone, UserX, Wallet } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../auth/useAuth.js';
import { classLabel } from '../students/format.js';
import { useMyTimetable } from '../timetable/hooks.js';
import { useAnnouncements } from '../announcements/hooks.js';

export default function ParentHome() {
  const { user } = useAuth();
  const timetable = useMyTimetable();
  const announcements = useAnnouncements({ limit: 3 });

  const children = timetable.data?.students ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold">Bonjour {user.firstName} !</h1>
        <p className="mt-1 text-lg">Voici un aperçu de la scolarité de tes enfants.</p>
      </header>

      <section aria-label="Mes enfants">
        <h2 className="mb-3 text-xl font-semibold">Mes enfants</h2>
        {timetable.isPending ? (
          <div role="status" aria-label="Chargement" className="h-32 animate-pulse rounded-2xl bg-ink/10" />
        ) : timetable.error ? (
          <Alert tone="danger" title="Impossible de charger les informations">
            <p>{timetable.error.message}</p>
            <Button variant="secondary" onClick={() => timetable.refetch()} className="mt-3">Réessayer</Button>
          </Alert>
        ) : children.length === 0 ? (
          <EmptyState icon={UserX} title="Aucun enfant inscrit cette année">
            Dès qu’un de tes enfants est inscrit dans une classe de l’année en cours, son profil apparaît ici.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {children.map(({ student, class: schoolClass }) => (
              <li key={student.id} className="rounded-2xl bg-paper p-5">
                <p className="text-2xl font-semibold">{student.name}</p>
                <p className="mt-1 text-sm text-ink/70">{classLabel(schoolClass)}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  <li><Link to="/parent/emploi-du-temps" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky/10 px-3 font-bold text-sky hover:bg-sky/15"><CalendarClock className="size-4" aria-hidden="true" /> Emploi du temps</Link></li>
                  <li><Link to="/parent/bulletins" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky/10 px-3 font-bold text-sky hover:bg-sky/15"><FileText className="size-4" aria-hidden="true" /> Bulletins</Link></li>
                  <li><Link to="/parent/absences" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky/10 px-3 font-bold text-sky hover:bg-sky/15"><UserX className="size-4" aria-hidden="true" /> Absences</Link></li>
                  <li><Link to="/parent/paiements" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky/10 px-3 font-bold text-sky hover:bg-sky/15"><Wallet className="size-4" aria-hidden="true" /> Paiements</Link></li>
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

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