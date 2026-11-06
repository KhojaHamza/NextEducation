import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, UserX } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { classLabel } from '../students/format.js';
import ClassScopePicker from './ClassScopePicker.jsx';
import { messageFor } from './errors.js';
import { formatAbsenceDate, periodLabel, statusOptions, studentName } from './format.js';
import { useAbsenceMutations, useAbsences } from './hooks.js';
import ReviewModal from './ReviewModal.jsx';
import StatusBadge from './StatusBadge.jsx';
import { useClassScope } from './useClassScope.js';

const LIMIT = 200; // the backend sends the 200 most recent absences

export default function AbsencesPage() {
  const toast = useToast();
  const scope = useClassScope();
  const { remove } = useAbsenceMutations();
  const base = scope.isTeacher ? '/enseignant' : '/admin';

  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const badRange = Boolean(from && to && from > to);
  const list = useAbsences({ classId: scope.schoolClass?.id, status, from, to }, !badRange);
  const rows = list.data ?? [];

  const confirmRemove = async () => {
    try {
      await remove.mutateAsync(removing.id);
      toast.success('Absence retirée.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setRemoving(null);
  };

  const columns = [
    { key: 'date', header: 'Date', primary: true, render: (a) => <strong>{formatAbsenceDate(a.date)}</strong> },
    { key: 'period', header: 'Demi-journée', render: (a) => periodLabel[a.period] },
    {
      key: 'student',
      header: 'Élève',
      render: (a) =>
        scope.isTeacher ? (
          studentName(a.student)
        ) : (
          <Link to={`/admin/eleves/${a.student.id}`} className="font-bold text-sky hover:underline">
            {studentName(a.student)}
          </Link>
        ),
    },
    { key: 'class', header: 'Classe', render: (a) => classLabel(a.schoolClass) },
    { key: 'status', header: 'Statut', render: (a) => <StatusBadge status={a.justificationStatus} /> },
    {
      key: 'reason',
      header: 'Justificatif',
      render: (a) =>
        a.justificationReason ? <span className="whitespace-pre-line">{a.justificationReason}</span> : '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (a) => (
        <div className="flex flex-wrap justify-end gap-1">
          {!scope.isTeacher && a.justificationStatus !== 'ACCEPTED' && (
            <Button variant="ghost" onClick={() => setReviewing(a)}>
              Traiter
            </Button>
          )}
          <Button variant="ghost" onClick={() => setRemoving(a)}>
            Retirer
          </Button>
        </div>
      ),
    },
  ];

  const filtered = Boolean(scope.schoolClass || status || from || to);
  const empty = (
    <EmptyState icon={UserX} title={filtered ? 'Aucune absence avec ces filtres' : 'Aucune absence enregistrée'}>
      {filtered ? 'Change les filtres pour voir d’autres absences.' : 'Les absences saisies lors de l’appel apparaîtront ici.'}
    </EmptyState>
  );

  return (
    <>
      <PageHeader
        title="Absences"
        description={
          scope.isTeacher ? 'Les absences de tes classes.' : 'Les absences de l’école et les justificatifs à traiter.'
        }
        actions={
          <Link
            to={`${base}/appel`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky px-5 py-2.5 font-bold text-white hover:bg-sky/90"
          >
            <ClipboardCheck className="size-4" aria-hidden="true" />
            Faire l’appel
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <ClassScopePicker scope={scope} allLabel={scope.isTeacher ? 'Toutes mes classes' : 'Toutes les classes'} />
        <SelectField label="Statut" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-52">
          <option value="">Tous les statuts</option>
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </SelectField>
        <TextField label="Du" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-44" />
        <TextField label="Au" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-44" />
      </div>

      {badRange ? (
        <Alert tone="info">La date de début doit être avant la date de fin.</Alert>
      ) : (
        <>
          <div className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined} aria-busy={list.isFetching}>
            <DataTable
              columns={columns}
              rows={rows}
              loading={list.isPending}
              error={list.error ? { message: messageFor(list.error) } : null}
              onRetry={list.refetch}
              empty={empty}
            />
          </div>
          {rows.length > 0 && (
            <p className="mt-4 text-sm text-ink/70" aria-live="polite">
              {rows.length} absence{rows.length > 1 ? 's' : ''}
              {rows.length >= LIMIT && ` (les ${LIMIT} plus récentes : affine les filtres pour voir les autres)`}.
            </p>
          )}
        </>
      )}

      <ReviewModal open={Boolean(reviewing)} absence={reviewing} onClose={() => setReviewing(null)} />

      <ConfirmDialog
        open={Boolean(removing)}
        title="Retirer cette absence ?"
        confirmLabel="Retirer"
        danger
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      >
        <p>
          L’absence de {removing ? studentName(removing.student) : ''} du {removing ? formatAbsenceDate(removing.date) : ''}{' '}
          ({removing ? periodLabel[removing.period].toLowerCase() : ''}) sera retirée.
        </p>
      </ConfirmDialog>
    </>
  );
}