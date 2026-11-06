import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../auth/useAuth.js';
import { useSchoolYears } from '../classes/hooks.js';
import { classLabel } from '../students/format.js';
import { useClassesOfYear } from '../students/linkHooks.js';
import { useSubjectsOfLevel } from '../subjects/hooks.js';
import { messageFor } from './errors.js';
import { termLabel, typeLabel } from './format.js';
import { useEvaluationMutations, useMyClasses } from './hooks.js';

const schema = z.object({
  title: z.string().trim().min(1, 'Saisis le titre.').max(120, '120 caractères maximum.'),
  type: z.enum(['CONTINUOUS', 'EXAM']),
  term: z.enum(['T1', 'T2', 'T3']),
  date: z.string().min(1, 'Choisis la date.'),
  maxScore: z
    .number({ error: 'Saisis la note maximale (par exemple 20).' })
    .positive('La note maximale doit être supérieure à 0.')
    .max(100, 'La note maximale est 100.'),
  weight: z
    .number({ error: 'Saisis le poids (par exemple 1).' })
    .positive('Le poids doit être supérieur à 0.')
    .max(10, 'Le poids maximum est 10.'),
});

const today = () => new Date().toISOString().slice(0, 10);

function EvaluationForm({ record, onClose }) {
  const isEdit = Boolean(record);
  const { user } = useAuth();
  const isTeacher = user.role === 'TEACHER';
  const toast = useToast();
  const { create, update } = useEvaluationMutations();

  // Where the evaluation goes (creation only: class and subject of an existing evaluation never change)
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [targetErrors, setTargetErrors] = useState({});
  const [serverError, setServerError] = useState(null);

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: record?.title ?? '',
      type: record?.type ?? 'CONTINUOUS',
      term: record?.term ?? 'T1',
      date: record?.date?.slice(0, 10) ?? today(),
      maxScore: record ? Number(record.maxScore) : 20,
      weight: record ? Number(record.weight) : 1,
    },
  });

  const onSubmit = async (values) => {
    setServerError(null);

    if (!isEdit) {
      const next = {};
      if (!classId) next.class = 'Choisis une classe.';
      if (!subjectId) next.subject = 'Choisis une matière.';
      setTargetErrors(next);
      if (Object.keys(next).length) return;
    }

    try {
      if (isEdit) {
        await update.mutateAsync({ id: record.id, body: values });
        toast.success('Évaluation modifiée.');
      } else {
        await create.mutateAsync({ ...values, classId: Number(classId), subjectId: Number(subjectId) });
        toast.success('Évaluation créée.');
      }
      onClose();
    } catch (err) {
      setServerError(messageFor(err));
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
    return <Alert tone="info">Aucune année scolaire n’existe encore : crée-en une avant de créer une évaluation.</Alert>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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
              error={targetErrors.class}
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
              error={targetErrors.subject}
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
        hint="Par exemple Contrôle de fractions."
        autoComplete="off"
        error={errors.title?.message}
        {...register('title')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Type" error={errors.type?.message} {...register('type')}>
          {Object.entries(typeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Trimestre" error={errors.term?.message} {...register('term')}>
          {Object.entries(termLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>

      <TextField label="Date" type="date" error={errors.date?.message} {...register('date')} />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Note maximale"
          type="number"
          inputMode="decimal"
          step="any"
          hint="Par exemple 20 ou 10."
          error={errors.maxScore?.message}
          {...register('maxScore', { valueAsNumber: true })}
        />
        <TextField
          label="Poids"
          type="number"
          inputMode="decimal"
          step="any"
          hint="Importance dans la moyenne de la matière."
          error={errors.weight?.message}
          {...register('weight', { valueAsNumber: true })}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Enregistrer' : 'Créer l’évaluation'}
        </Button>
      </div>
    </form>
  );
}

// The form is mounted only while the window is open, so it always starts from fresh values
export default function EvaluationFormModal({ open, record, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={record ? 'Modifier l’évaluation' : 'Nouvelle évaluation'}>
      <EvaluationForm record={record} onClose={onClose} />
    </Modal>
  );
}