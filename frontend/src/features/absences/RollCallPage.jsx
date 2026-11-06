import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Users } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import ClassScopePicker from './ClassScopePicker.jsx';
import { messageFor } from './errors.js';
import { formatAbsenceDate, periodLabel, periodOptions, studentName, todayISO } from './format.js';
import { useAbsenceMutations, useAbsences, useClassRoster } from './hooks.js';
import { useClassScope } from './useClassScope.js';

export default function RollCallPage() {
  const toast = useToast();
  const scope = useClassScope();
  const { record, remove } = useAbsenceMutations();
  const base = scope.isTeacher ? '/enseignant' : '/admin';

  const today = todayISO();
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState('MORNING');
  const [picked, setPicked] = useState({ key: '', ids: [] });
  const [failed, setFailed] = useState({ key: '', items: [] });
  const [removing, setRemoving] = useState(null);

  const classId = scope.schoolClass?.id;
  const dateOk = Boolean(date) && date <= today;
  const ready = Boolean(classId) && dateOk;

  const roster = useClassRoster(classId);
  const existing = useAbsences({ classId, from: date, to: date }, ready);

  // The selection belongs to one class, one day and one half-day: it is forgotten when one of them changes
  const selectionKey = `${classId}|${date}|${period}`;
  const selectedIds = picked.key === selectionKey ? picked.ids : [];
  const failures = failed.key === selectionKey ? failed.items : [];

  const students = roster.data ?? [];
  const recorded = new Map(
    (existing.data ?? []).filter((a) => a.period === period).map((a) => [a.studentId ?? a.student.id, a]),
  );

  const toggle = (id) =>
    setPicked({
      key: selectionKey,
      ids: selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    });

  const save = async () => {
    setFailed({ key: '', items: [] });
    try {
      const results = await record.mutateAsync({ studentIds: selectedIds, date, period });
      const errors = results.filter((r) => !r.ok);
      const okCount = results.length - errors.length;
      if (okCount) toast.success(`${okCount} absence${okCount > 1 ? 's' : ''} enregistrée${okCount > 1 ? 's' : ''}.`);

      // Students whose absence could not be saved stay selected, with the reason
      setPicked({ key: selectionKey, ids: errors.map((r) => r.studentId) });
      setFailed({
        key: selectionKey,
        items: errors.map((r) => {
          const student = students.find((s) => s.id === r.studentId);
          return { id: r.studentId, name: student ? studentName(student) : 'Élève', message: messageFor(r.error) };
        }),
      });
    } catch (err) {
      toast.error(messageFor(err));
    }
  };

  const confirmRemove = async () => {
    try {
      await remove.mutateAsync(removing.id);
      toast.success('Absence retirée.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setRemoving(null);
  };

  const loadError = roster.error || existing.error;

  let body;
  if (!classId) {
    body = (
      <EmptyState icon={ClipboardCheck} title="Choisis une classe">
        Sélectionne une classe, une date et une demi-journée pour faire l’appel.
      </EmptyState>
    );
  } else if (!dateOk) {
    body = <Alert tone="info">Choisis une date qui n’est pas dans le futur.</Alert>;
  } else if (loadError) {
    body = (
      <Alert tone="danger" title="Impossible de charger l’appel">
        <p>{messageFor(loadError)}</p>
        <Button
          variant="secondary"
          onClick={() => {
            roster.refetch();
            existing.refetch();
          }}
          className="mt-3"
        >
          Réessayer
        </Button>
      </Alert>
    );
  } else if (roster.isPending || existing.isPending) {
    body = <div role="status" aria-label="Chargement de l’appel" className="h-64 animate-pulse rounded-2xl bg-ink/10" />;
  } else if (students.length === 0) {
    body = (
      <EmptyState icon={Users} title="Aucun élève dans cette classe">
        Inscris des élèves dans cette classe pour pouvoir faire l’appel.
      </EmptyState>
    );
  } else {
    body = (
      <div className="space-y-4">
        <p aria-live="polite">
          Coche les élèves <strong>absents</strong> ({periodLabel[period].toLowerCase()}, {formatAbsenceDate(date)}).{' '}
          {recorded.size > 0 && `${recorded.size} absence${recorded.size > 1 ? 's' : ''} déjà enregistrée${recorded.size > 1 ? 's' : ''}.`}
        </p>

        {failures.length > 0 && (
          <Alert tone="danger" title="Certaines absences n’ont pas été enregistrées">
            <ul className="list-disc space-y-1 ps-5">
              {failures.map((f) => (
                <li key={f.id}>
                  {f.name} : {f.message}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <ul className="space-y-2" aria-busy={existing.isFetching}>
          {students.map((s) => {
            const done = recorded.get(s.id);
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper p-3">
                {done ? (
                  <>
                    <span className="font-bold">{studentName(s)}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">Absent(e)</Badge>
                      <Button variant="ghost" onClick={() => setRemoving(done)}>
                        Retirer
                      </Button>
                    </span>
                  </>
                ) : (
                  <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="size-5 shrink-0"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                    <span className="font-bold">{studentName(s)}</span>
                  </label>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button onClick={save} loading={record.isPending} disabled={selectedIds.length === 0}>
            Enregistrer {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Appel"
        description="Marque les élèves absents d’une classe pour une demi-journée."
        actions={
          <Link
            to={`${base}/absences`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-paper px-5 py-2.5 font-bold text-ink transition-colors hover:border-ink/40"
          >
            Voir les absences
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <ClassScopePicker scope={scope} />
        <TextField
          label="Date"
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-48"
        />
        <SelectField label="Demi-journée" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full sm:w-48">
          {periodOptions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </SelectField>
      </div>

      {body}

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