import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { messageFor } from './errors.js';
import { useMyTimetable } from './hooks.js';
import WeekGrid from './WeekGrid.jsx';

// Student: own class week (read only)
export default function StudentTimetablePage() {
  const week = useMyTimetable();
  const data = week.data;

  // Le backend peut renvoyer { days: {...} } (format enseignant) 
  // ou { students: [{ days: {...} }] } (format parent/élève).
  const days = data?.days || (data?.students && data.students.length > 0 ? data.students[0].days : null);

  return (
    <>
      <PageHeader title="Mon emploi du temps" description="Tes cours de la semaine, pour l'année scolaire en cours." />

      {week.isPending ? (
        <div role="status" aria-label="Chargement de l’emploi du temps" className="h-64 animate-pulse rounded-2xl bg-ink/10" />
      ) : week.error ? (
        <Alert tone="danger" title="Impossible de charger ton emploi du temps">
          <p>{messageFor(week.error)}</p>
          <Button variant="secondary" onClick={() => week.refetch()} className="mt-3">
            Réessayer
          </Button>
        </Alert>
      ) : (
        <div aria-busy={week.isFetching}>
          <WeekGrid days={days} show="class" />
        </div>
      )}
    </>
  );
}