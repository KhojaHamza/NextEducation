import { useState } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { NotebookPen, Plus } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import RowActions from '../../components/ui/RowActions.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../auth/useAuth.js';
import ClassPicker from '../classes/ClassPicker.jsx';
import { useMyClasses } from '../evaluations/hooks.js';
import { classLabel, formatDate } from '../students/format.js';
import { messageFor } from './errors.js';
import HomeworkFormModal from './HomeworkFormModal.jsx';
import { useHomeworkMutations, useHomeworks } from './hooks.js';

const dueInfo = (dueDate) => {
  const days = differenceInCalendarDays(parseISO(dueDate.slice(0, 10)), new Date());
  if (days < 0) return { text: 'Date limite dépassée', late: true };
  if (days === 0) return { text: 'Pour aujourd’hui', late: false };
  if (days === 1) return { text: 'Pour demain', late: false };
  return { text: `Dans ${days} jours`, late: false };
};

export default function HomeworksPage() {
  const { user } = useAuth();
  const isTeacher = user.role === 'TEACHER';
  const canWrite = isTeacher || user.role === 'ADMIN';
  const toast = useToast();
  const { remove } = useHomeworkMutations();

  const [schoolClass, setSchoolClass] = useState(null); // administrator's picker
  const [myClassId, setMyClassId] = useState(''); // teacher's picker
  const [showPast, setShowPast] = useState(false);
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null);

  const mine = useMyClasses(isTeacher);
  const classId = isTeacher ? myClassId : schoolClass?.id;
  const list = useHomeworks({ classId, from: showPast ? undefined : format(new Date(), 'yyyy-MM-dd') });
  const rows = list.data ?? [];

  const openNew = () => setForm({ open: true, record: null });

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Devoir supprimé.');
    } catch (err) {
      toast.error(messageFor(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Devoirs"
        description={
          canWrite
            ? 'Les devoirs publiés pour tes classes, avec leur date limite.'
            : 'Les devoirs à faire, avec leur date limite.'
        }
        actions={
          canWrite && (
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              Nouveau devoir
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        {isTeacher && (
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
        )}
        {user.role === 'ADMIN' && (
          <ClassPicker value={schoolClass} onChange={setSchoolClass} allLabel="Toutes les classes" />
        )}

        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5"
            checked={showPast}
            onChange={(e) => setShowPast(e.target.checked)}
          />
          Afficher aussi les devoirs passés
        </label>
      </div>

      {list.isPending && <div role="status" aria-label="Chargement" className="h-40 animate-pulse rounded-2xl bg-ink/10" />}
      {list.error && (
        <Alert tone="danger" title="Impossible de charger les devoirs">
          <p>{list.error.message}</p>
        </Alert>
      )}
      {list.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={NotebookPen}
          title={showPast ? 'Aucun devoir' : 'Aucun devoir à venir'}
          action={canWrite && <Button onClick={openNew}>Publier un devoir</Button>}
        >
          Les devoirs publiés par les enseignants apparaîtront ici.
        </EmptyState>
      )}

      {rows.length > 0 && (
        <ul className={`space-y-3 ${list.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}`}>
          {rows.map((h) => {
            const due = dueInfo(h.dueDate);
            return (
              <li key={h.id} className="rounded-2xl bg-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{h.title}</p>
                    <p className="mt-1 text-sm text-ink/70">
                      {h.subject.name} · {classLabel(h.schoolClass)} · {h.author.firstName} {h.author.lastName}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${due.late ? 'bg-coral/15' : 'bg-sky/15'}`}
                  >
                    {formatDate(h.dueDate)} · {due.text}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap">{h.description}</p>
                {canWrite && (
                  <div className="mt-2 flex justify-end">
                    <RowActions
                      label={`le devoir ${h.title}`}
                      onEdit={() => setForm({ open: true, record: h })}
                      onDelete={() => setDeleting(h)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <HomeworkFormModal open={form.open} record={form.record} onClose={() => setForm({ open: false, record: null })} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Supprimer ce devoir ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>Le devoir « {deleting?.title} » ne sera plus visible par les élèves.</p>
      </ConfirmDialog>
    </>
  );
}