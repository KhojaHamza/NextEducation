import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus, SearchX } from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import RowActions from '../../components/ui/RowActions.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../auth/useAuth.js';
import ClassPicker from '../classes/ClassPicker.jsx';
import { classLabel, formatDate } from '../students/format.js';
import { messageFor } from './errors.js';
import EvaluationFormModal from './EvaluationFormModal.jsx';
import { termLabel } from './format.js';
import { useEvaluationMutations, useEvaluations, useMyClasses } from './hooks.js';

export default function EvaluationsPage() {
  const { user } = useAuth();
  const isTeacher = user.role === 'TEACHER';
  const base = isTeacher ? '/enseignant' : '/admin';
  const toast = useToast();
  const { remove } = useEvaluationMutations();

  const [schoolClass, setSchoolClass] = useState(null); // administrator's picker
  const [myClassId, setMyClassId] = useState(''); // teacher's picker
  const [term, setTerm] = useState('');
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null); // { evaluation, step: 'ask' | 'grades', count }

  const mine = useMyClasses(isTeacher);
  const classId = isTeacher ? myClassId : schoolClass?.id;
  const list = useEvaluations({ classId, term });
  const filtered = Boolean(classId || term);

  const openNew = () => setForm({ open: true, record: null });

  const handleDelete = async (confirm) => {
    const evaluation = deleting.evaluation;
    try {
      await remove.mutateAsync({ id: evaluation.id, confirm });
      toast.success('Évaluation supprimée.');
      setDeleting(null);
    } catch (err) {
      // The backend refuses once when grades exist: we ask a second, explicit confirmation
      const grades = /has (\d+) grade\(s\)/.exec(err.message);
      if (!confirm && err.status === 409 && grades) {
        setDeleting({ evaluation, step: 'grades', count: Number(grades[1]) });
        return;
      }
      setDeleting(null);
      toast.error(messageFor(err));
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Évaluation',
      primary: true,
      render: (e) => (
        <span className="flex flex-wrap items-center gap-2">
          <Link to={`${base}/evaluations/${e.id}/notes`} className="font-bold text-sky hover:underline">
            {e.title}
          </Link>
          {e.type === 'EXAM' && <Badge tone="warning">Examen</Badge>}
        </span>
      ),
    },
    { key: 'target', header: 'Classe et matière', render: (e) => `${classLabel(e.schoolClass)} · ${e.subject.name}` },
    { key: 'term', header: 'Trimestre', render: (e) => termLabel[e.term] },
    { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
    { key: 'max', header: 'Note maximale', render: (e) => `/ ${Number(e.maxScore)}` },
    {
      key: 'actions',
      header: 'Actions',
      render: (e) => (
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Link
            to={`${base}/evaluations/${e.id}/notes`}
            className="inline-flex min-h-11 items-center rounded-xl px-4 font-bold text-sky hover:bg-sky/10"
          >
            Saisir les notes
          </Link>
          <RowActions
            label={`l’évaluation ${e.title}`}
            onEdit={() => setForm({ open: true, record: e })}
            onDelete={() => setDeleting({ evaluation: e, step: 'ask' })}
          />
        </div>
      ),
    },
  ];

  const empty = filtered ? (
    <EmptyState icon={SearchX} title="Aucune évaluation trouvée">
      Change la classe ou le trimestre.
    </EmptyState>
  ) : (
    <EmptyState
      icon={ClipboardList}
      title="Aucune évaluation pour l’instant"
      action={<Button onClick={openNew}>Nouvelle évaluation</Button>}
    >
      Crée un contrôle ou un examen, puis saisis les notes des élèves.
    </EmptyState>
  );

  return (
    <>
      <PageHeader
        title="Évaluations"
        description={
          isTeacher
            ? 'Les contrôles et examens de tes classes, les plus récents d’abord.'
            : 'Les contrôles et examens de l’école, les plus récents d’abord.'
        }
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle évaluation
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        {isTeacher ? (
          <SelectField
            label="Classe"
            value={myClassId}
            onChange={(e) => setMyClassId(e.target.value)}
            className="w-full sm:w-64"
          >
            <option value="">Toutes mes classes</option>
            {(mine.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {classLabel(c)}
                {c.schoolYear && !c.schoolYear.isCurrent ? ` (${c.schoolYear.label})` : ''}
              </option>
            ))}
          </SelectField>
        ) : (
          <ClassPicker value={schoolClass} onChange={setSchoolClass} allLabel="Toutes les classes" />
        )}

        <SelectField label="Trimestre" value={term} onChange={(e) => setTerm(e.target.value)} className="w-full sm:w-56">
          <option value="">Tous les trimestres</option>
          {Object.entries(termLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined} aria-busy={list.isFetching}>
        <DataTable
          columns={columns}
          rows={list.data ?? []}
          loading={list.isPending}
          error={list.error}
          onRetry={list.refetch}
          empty={empty}
        />
      </div>

      <EvaluationFormModal open={form.open} record={form.record} onClose={() => setForm({ open: false, record: null })} />

      <ConfirmDialog
        open={deleting?.step === 'ask'}
        title="Supprimer cette évaluation ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={() => handleDelete(false)}
        onCancel={() => setDeleting(null)}
      >
        <p>L’évaluation « {deleting?.evaluation.title} » sera retirée de la liste.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={deleting?.step === 'grades'}
        title="Des notes existent"
        confirmLabel="Supprimer aussi les notes"
        danger
        onConfirm={() => handleDelete(true)}
        onCancel={() => setDeleting(null)}
      >
        <p>
          Cette évaluation contient {deleting?.count} note{deleting?.count > 1 ? 's' : ''}. Les supprimer avec
          l’évaluation ?
        </p>
      </ConfirmDialog>
    </>
  );
}