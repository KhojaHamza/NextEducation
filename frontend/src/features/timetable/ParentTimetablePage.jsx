import { Users } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { messageFor } from './errors.js';
import { useMyTimetable } from './hooks.js';
import WeekGrid from './WeekGrid.jsx';

// Parent: one week per child enrolled in the school year in progress (read only)
export default function ParentTimetablePage() {
  const week = useMyTimetable();
  const students = week.data?.students ?? [];

  return (
    <>
      <PageHeader title="Emploi du temps" description="La semaine de la classe de chaque enfant." />

      {week.isPending ? (
        <div role="status" aria-label="Chargement de l’emploi du temps" className="h-64 animate-pulse rounded-2xl bg-ink/10" />
      ) : week.error ? (
        <Alert tone="danger" title="Impossible de charger l’emploi du temps">
          <p>{messageFor(week.error)}</p>
          <Button variant="secondary" onClick={() => week.refetch()} className="mt-3">
            Réessayer
          </Button>
        </Alert>
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="Aucun enfant inscrit cette année">
          L’emploi du temps apparaît dès qu’un de tes enfants est inscrit dans une classe de l’année en cours.
        </EmptyState>
      ) : (
        <div className="space-y-8" aria-busy={week.isFetching}>
          {students.map((entry) => (
            <section key={entry.student.id} aria-label={entry.student.name}>
              <h2 className="mb-3 text-2xl font-semibold">
                {entry.student.name} <span className="text-lg font-bold text-ink/70">· {entry.class.name}</span>
              </h2>
              <WeekGrid days={entry.days} show="class" />
            </section>
          ))}
        </div>
      )}
    </>
  );
}