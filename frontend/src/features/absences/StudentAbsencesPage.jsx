import { CircleCheck } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { messageFor } from './errors.js';
import { formatAbsenceDate, periodLabel } from './format.js';
import { useMyAbsences } from './hooks.js';
import StatusBadge from './StatusBadge.jsx';

export default function StudentAbsencesPage() {
  const list = useMyAbsences();
  const rows = list.data ?? [];

  const columns = [
    { key: 'date', header: 'Date', primary: true, render: (a) => <strong>{formatAbsenceDate(a.date)}</strong> },
    { key: 'period', header: 'Demi-journée', render: (a) => periodLabel[a.period] },
    { key: 'status', header: 'Statut', render: (a) => <StatusBadge status={a.justificationStatus} /> },
    {
      key: 'details',
      header: 'Justificatif',
      render: (a) =>
        a.justificationStatus === 'NONE' ? (
          '—'
        ) : (
          <span>
            <span className="whitespace-pre-line">{a.justificationReason}</span>
            {a.reviewNote && <span className="block text-sm text-ink/70">Réponse de l’école : {a.reviewNote}</span>}
          </span>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Mes absences" description="Le relevé de tes absences et leurs justificatifs." />
      {list.error ? (
        <Alert tone="danger" title="Impossible de charger les absences">
          <p>{messageFor(list.error)}</p>
          <Button variant="secondary" onClick={() => list.refetch()} className="mt-3">Réessayer</Button>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          loading={list.isPending}
          empty={<EmptyState icon={CircleCheck} title="Aucune absence">Aucune absence n’a été enregistrée à ton nom.</EmptyState>}
        />
      )}
    </>
  );
}