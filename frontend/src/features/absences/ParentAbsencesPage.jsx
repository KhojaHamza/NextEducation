import { useState } from 'react';
import { CircleCheck } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { messageFor } from './errors.js';
import { formatAbsenceDate, periodLabel, studentName } from './format.js';
import { useMyAbsences } from './hooks.js';
import JustifyModal from './JustifyModal.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function ParentAbsencesPage() {
  const list = useMyAbsences();
  const [childId, setChildId] = useState('');
  const [justifying, setJustifying] = useState(null);

  const all = list.data ?? [];
  const children = [...new Map(all.map((a) => [a.student.id, a.student])).values()];
  const rows = childId ? all.filter((a) => String(a.student.id) === childId) : all;
  const toJustify = rows.filter((a) => ['NONE', 'REJECTED'].includes(a.justificationStatus)).length;

  const columns = [
    { key: 'date', header: 'Date', primary: true, render: (a) => <strong>{formatAbsenceDate(a.date)}</strong> },
    { key: 'period', header: 'Demi-journée', render: (a) => periodLabel[a.period] },
    { key: 'student', header: 'Enfant', render: (a) => studentName(a.student) },
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
    {
      key: 'actions',
      header: 'Actions',
      render: (a) =>
        ['NONE', 'REJECTED'].includes(a.justificationStatus) ? (
          <Button variant="secondary" onClick={() => setJustifying(a)}>
            {a.justificationStatus === 'REJECTED' ? 'Justifier à nouveau' : 'Justifier'}
          </Button>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Absences" description="Les absences de tes enfants et leurs justificatifs." />

      {list.error ? (
        <Alert tone="danger" title="Impossible de charger les absences">
          <p>{messageFor(list.error)}</p>
          <Button variant="secondary" onClick={() => list.refetch()} className="mt-3">
            Réessayer
          </Button>
        </Alert>
      ) : (
        <>
          {children.length > 1 && (
            <div className="mb-6">
              <SelectField label="Enfant" value={childId} onChange={(e) => setChildId(e.target.value)} className="w-full sm:w-64">
                <option value="">Tous mes enfants</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {studentName(c)}
                  </option>
                ))}
              </SelectField>
            </div>
          )}

          {toJustify > 0 && (
            <div className="mb-6">
              <Alert tone="info">
                {toJustify} absence{toJustify > 1 ? 's' : ''} à justifier. Utilise le bouton « Justifier » de la ligne concernée.
              </Alert>
            </div>
          )}

          <DataTable
            columns={columns}
            rows={rows}
            loading={list.isPending}
            empty={
              <EmptyState icon={CircleCheck} title="Aucune absence">
                Aucune absence n’a été enregistrée pour tes enfants.
              </EmptyState>
            }
          />
        </>
      )}

      <JustifyModal open={Boolean(justifying)} absence={justifying} onClose={() => setJustifying(null)} />
    </>
  );
}