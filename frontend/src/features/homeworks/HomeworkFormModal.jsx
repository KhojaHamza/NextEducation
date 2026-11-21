import { useState } from 'react';
import { format } from 'date-fns';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextAreaField from '../../components/ui/TextAreaField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../auth/useAuth.js';
import { useSchoolYears } from '../classes/hooks.js';
import { useMyClasses } from '../evaluations/hooks.js';
import { classLabel } from '../students/format.js';
import { useClassesOfYear } from '../students/linkHooks.js';
import { useSubjectsOfLevel } from '../subjects/hooks.js';
import { messageFor } from './errors.js';
import { useHomeworkMutations } from './hooks.js';

const today = () => format(new Date(), 'yyyy-MM-dd');

function HomeworkForm({ record, onClose }) {
  const isEdit = Boolean(record);
  const { user } = useAuth();
  const isTeacher = user.role === 'TEACHER';
  const toast = useToast();
  const { create, update } = useHomeworkMutations();

  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState(record?.title ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [dueDate, setDueDate] = useState(record?.dueDate?.slice(0, 10) ?? '');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const mine = useMyClasses(isTeacher && !isEdit);
  const years = useSchoolYears();
  const yearList = years.data ?? [];
  const activeYear = yearId || String((yearList.find((y) => y.isCurrent) ?? yearList[0])?.id ?? '');
  const adminClasses = useClassesOfYear(isTeacher || isEdit ? '' : activeYear);

  const myClasses = mine.data ?? [];
  const currentMine = myClasses.filter((c) => c.schoolYear?.isCurrent);
  const classOptions = isTeacher ? (currentMine.length ? currentMine : myClasses) : (adminClasses.data ?? []);
  const selectedClass = classOptions.find((c) => String(c.id) === classId);

  const adminSubjects = useSubjectsOfLevel(isTeacher || isEdit ? undefined : selectedClass?.level);
  const subjectOptions = isTeacher ? (selectedClass?.subjects ?? []) : (adminSubjects.data ?? []);

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);

    const next = {};
    if (!isEdit && !classId) next.class = 'Choisis une classe.';
    if (!isEdit && !subjectId) next.subject = 'Choisis une matière.';
    if (!title.trim()) next.title = 'Saisis le titre.';
    if (!description.trim()) next.description = 'Saisis la description du devoir.';
    if (!dueDate) next.dueDate = 'Choisis la date limite.';
    else if ((!isEdit || dueDate !== record.dueDate.slice(0, 10)) && dueDate < today()) {
      next.dueDate = 'La date limite ne peut pas être dans le passé.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const values = { title: title.trim(), description: description.trim(), dueDate };
    setSaving(true);
    try {
      if (isEdit) {
        await update.mutateAsync({ id: record.id, body: values });
        toast.success('Devoir modifié.');
      } else {
        await create.mutateAsync({ ...values, classId: Number(classId), subjectId: Number(subjectId) });
        toast.success('Devoir publié.');
      }
      onClose();
    } catch (err) {
      setServerError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  const loadError = isEdit ? null : isTeacher ? mine.error : (years.error ?? adminClasses.error);
  if (loadError) {
    return (
      <Alert tone="danger" title="Impossible de charger les données">
        <p>{loadError.message}</p>
      </Alert>
    );
  }
  if (!isEdit && (isTeacher ? mine.isPending : years.isPending)) {
    return <div role="status" aria-label="Chargement" className="h-40 animate-pulse rounded-xl bg-ink/10" />;
  }
  if (!isEdit && isTeacher && classOptions.length === 0) {
    return (
      <Alert tone="info">
        Aucune classe ne t’est attribuée pour le moment. L’administration doit d’abord t’attribuer une matière ou une
        classe.
      </Alert>
    );
  }
  if (!isEdit && !isTeacher && yearList.length === 0) {
    return <Alert tone="info">Aucune année scolaire n’existe encore : crée-en une avant de publier un devoir.</Alert>;
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      {isEdit ? (
        <p>
          <span className="text-ink/70">Classe : </span>
          <strong>{classLabel(record.schoolClass)}</strong>
          <span className="text-ink/70"> · Matière : </span>
          <strong>{record.subject.name}</strong>
        </p>
      ) : (
        <>
          {!isTeacher && (
            <SelectField
              label="Année scolaire"
              value={activeYear}
              onChange={(e) => {
                setYearId(e.target.value);
                setClassId('');
                setSubjectId('');
              }}
            >
              {yearList.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                  {y.isCurrent ? ' (en cours)' : ''}
                </option>
              ))}
            </SelectField>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Classe"
              value={classId}
              error={errors.class}
              disabled={!isTeacher && adminClasses.isPending}
              onChange={(e) => {
                setClassId(e.target.value);
                setSubjectId('');
              }}
            >
              <option value="">Choisir…</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {classLabel(c)}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Matière"
              value={subjectId}
              error={errors.subject}
              disabled={!selectedClass}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">Choisir…</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
          </div>

          {selectedClass && !adminSubjects.isPending && subjectOptions.length === 0 && (
            <Alert tone="info">
              {isTeacher
                ? 'Aucune matière ne t’est attribuée dans cette classe.'
                : `Aucune matière n’existe pour le niveau ${selectedClass.level} : crée-en une dans « Matières ».`}
            </Alert>
          )}
        </>
      )}

      <TextField
        label="Titre"
        hint="Par exemple Exercices de fractions."
        autoComplete="off"
        maxLength={150}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
      />

      <TextAreaField
        label="Description"
        rows={6}
        maxLength={5000}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
      />

      <TextField
        label="Date limite"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        error={errors.dueDate}
      />

      {!isEdit && (
        <p className="text-sm text-ink/70">Les élèves de la classe et leurs parents seront prévenus.</p>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          {isEdit ? 'Enregistrer' : 'Publier le devoir'}
        </Button>
      </div>
    </form>
  );
}

// Mounted only while open, so the form always starts from fresh values
export default function HomeworkFormModal({ open, record, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={record ? 'Modifier le devoir' : 'Nouveau devoir'}>
      <HomeworkForm record={record} onClose={onClose} />
    </Modal>
  );
}