import { useState } from 'react';
import { CircleCheck, Send } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useSchoolYears } from '../classes/hooks.js';
import { formatAmount } from '../fees/format.js';
import { classLabel } from '../students/format.js';
import { useClassesOfYear } from '../students/linkHooks.js';
import { messageFor } from './errors.js';
import { studentName } from './format.js';
import { useOverdue, usePaymentMutations } from './hooks.js';
import NewPaymentModal from './NewPaymentModal.jsx';

function Total({ label, value }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <dt className="text-ink/70">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}

// Reminders always concern the school year in progress (backend rule)
function ReminderResult({ result }) {
  if (result.skipped) return <Alert tone="info">Aucune relance : aucune année scolaire n’est en cours.</Alert>;
  const count = result.dryRun ? result.wouldSend : result.sent;
  return (
    <Alert tone="success" title={result.dryRun ? 'Simulation (rien n’a été envoyé)' : 'Relances envoyées'}>
      <ul className="list-disc space-y-1 ps-5">
        <li>
          {result.lateStudents} élève{result.lateStudents > 1 ? 's' : ''} en retard ({result.schoolYear}).
        </li>
        <li>
          {count} notification{count > 1 ? 's' : ''} {result.dryRun ? 'seraient envoyées' : 'envoyées'}.
        </li>
        <li>{result.skippedRecent} ignorée{result.skippedRecent > 1 ? 's' : ''} (parent déjà relancé récemment).</li>
        <li>{result.withoutParent} élève{result.withoutParent > 1 ? 's' : ''} sans parent lié.</li>
      </ul>
    </Alert>
  );
}

export default function OverduePage() {
  const toast = useToast();
  const { reminders } = usePaymentMutations();

  const years = useSchoolYears();
  const yearList = years.data ?? [];
  const defaultYear = yearList.find((y) => y.isCurrent) ?? yearList[0];
  const [pickedYear, setPickedYear] = useState(null);
  const yearId = pickedYear ?? (defaultYear ? String(defaultYear.id) : '');

  const [classId, setClassId] = useState('');
  const [mode, setMode] = useState('overdue');
  const classes = useClassesOfYear(yearId);
  const classList = classes.data ?? [];

  const list = useOverdue({ schoolYearId: yearId, classId, all: mode === 'all' });
  const rows = list.data?.data ?? [];
  const totals = list.data?.totals;

  const [paying, setPaying] = useState(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [result, setResult] = useState(null);

  const simulate = async () => {
    try {
      setResult(await reminders.mutateAsync({ dryRun: true }));
    } catch (err) {
      toast.error(messageFor(err));
    }
  };

  const send = async () => {
    try {
      setResult(await reminders.mutateAsync({ dryRun: false }));
      toast.success('Relances envoyées.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setConfirmSend(false);
  };

  const columns = [
    {
      key: 'student',
      header: 'Élève',
      primary: true,
      render: (r) => (
        <>
          <span className="font-bold">{studentName(r.student)}</span>
          <span className="block text-sm text-ink/70">Matricule {r.student.matricule}</span>
        </>
      ),
    },
    { key: 'class', header: 'Classe' },
    { key: 'due', header: 'Total dû', render: (r) => formatAmount(r.due) },
    { key: 'paid', header: 'Payé', render: (r) => formatAmount(r.paid) },
    { key: 'balance', header: 'Solde', render: (r) => <strong>{formatAmount(r.balance)}</strong> },
    {
      key: 'overdueAmount',
      header: 'En retard',
      render: (r) => (Number(r.overdueAmount) > 0 ? <Badge tone="danger">{formatAmount(r.overdueAmount)}</Badge> : '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <Button variant="ghost" onClick={() => setPaying(r.student)}>
          Encaisser
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Impayés" description="Les élèves qui ont encore un solde à régler." />

      <div className="mb-6 flex flex-wrap gap-4">
        <SelectField
          label="Année scolaire"
          value={yearId}
          disabled={years.isPending || yearList.length === 0}
          onChange={(e) => {
            setPickedYear(e.target.value);
            setClassId('');
          }}
          className="w-full sm:w-56"
        >
          {yearList.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
              {y.isCurrent ? ' (en cours)' : ''}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Classe"
          value={classId}
          disabled={!yearId || classes.isPending}
          onChange={(e) => setClassId(e.target.value)}
          className="w-full sm:w-56"
        >
          <option value="">Toutes les classes</option>
          {classList.map((c) => (
            <option key={c.id} value={c.id}>
              {classLabel(c)}
            </option>
          ))}
        </SelectField>

        <SelectField label="Afficher" value={mode} onChange={(e) => setMode(e.target.value)} className="w-full sm:w-64">
          <option value="overdue">Échéances dépassées</option>
          <option value="all">Tous les soldes restants</option>
        </SelectField>
      </div>

      {totals && (
        <dl className="mb-6 grid gap-4 sm:grid-cols-3">
          <Total label="Élèves concernés" value={totals.students} />
          <Total label="Solde restant" value={formatAmount(totals.balance)} />
          <Total label="Dont en retard" value={formatAmount(totals.overdue)} />
        </dl>
      )}

      <section className="mb-6 rounded-2xl bg-paper p-5">
        <h2 className="text-xl font-semibold">Relances aux parents</h2>
        <p className="mt-1">
          Les parents des élèves en retard reçoivent une notification. Un parent n’est pas relancé deux fois de suite pour le
          même élève pendant quelques jours. Les relances concernent l’année scolaire en cours.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" loading={reminders.isPending && reminders.variables?.dryRun} onClick={simulate}>
            Simuler l’envoi
          </Button>
          <Button onClick={() => setConfirmSend(true)}>
            <Send className="size-4" aria-hidden="true" />
            Envoyer les relances
          </Button>
        </div>
        {result && (
          <div className="mt-4">
            <ReminderResult result={result} />
          </div>
        )}
      </section>

      <div aria-busy={list.isFetching}>
        <DataTable
          columns={columns}
          rows={rows}
          loading={list.isPending && Boolean(yearId)}
          error={list.error}
          onRetry={list.refetch}
          getRowKey={(r) => r.student.id}
          empty={
            <EmptyState icon={CircleCheck} title={mode === 'all' ? 'Aucun solde restant' : 'Aucun impayé en retard'}>
              {mode === 'all' ? 'Tous les élèves de cette sélection sont à jour.' : 'Aucune échéance dépassée pour cette sélection.'}
            </EmptyState>
          }
        />
      </div>

      <NewPaymentModal open={Boolean(paying)} initialStudent={paying} onClose={() => setPaying(null)} />

      <ConfirmDialog
        open={confirmSend}
        title="Envoyer les relances ?"
        confirmLabel="Envoyer"
        onConfirm={send}
        onCancel={() => setConfirmSend(false)}
      >
        <p>Les parents des élèves en retard vont recevoir une notification et un e-mail. Utilise d’abord « Simuler l’envoi » pour voir combien de parents seront prévenus.</p>
      </ConfirmDialog>
    </>
  );
}