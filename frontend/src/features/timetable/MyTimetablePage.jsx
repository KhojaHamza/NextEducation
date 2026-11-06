import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { messageFor } from './errors.js';
import { useMyTimetable } from './hooks.js';
import WeekGrid from './WeekGrid.jsx';

// Teacher: own week of the school year in progress (read only)
export default function MyTimetablePage() {
  const week = useMyTimetable();

  return (
    <>
      <PageHeader title="Mon emploi du temps" description="Tes cours de la semaine, pour l’année scolaire en cours." />

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
          <WeekGrid days={week.data.days} show="teacher" />
        </div>
      )}
    </>
  );
}