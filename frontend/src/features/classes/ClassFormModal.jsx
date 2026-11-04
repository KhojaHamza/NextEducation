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
import { messageFor } from './errors.js';
import { teacherName, useClassMutations, useSchoolYears, useTeacherOptions } from './hooks.js';

const schema = z.object({
  level: z.string().trim().min(1, 'Saisis le niveau.').max(20, '20 caractères maximum.'),
  section: z.string().trim().min(1, 'Saisis la section.').max(10, '10 caractères maximum.'),
  capacity: z
    .number({ error: 'Saisis une capacité entre 1 et 60.' })
    .int('Saisis un nombre entier.')
    .min(1, 'La capacité minimum est 1.')
    .max(60, 'La capacité maximum est 60.'),
  schoolYearId: z.string(),
  homeroomTeacherId: z.string(),
});

function ClassForm({ record, years, teachers, onClose }) {
  const isEdit = Boolean(record);
  const toast = useToast();
  const { create, update } = useClassMutations();
  const [serverError, setServerError] = useState(null);
  const currentYear = years.find((y) => y.isCurrent);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      level: record?.level ?? '',
      section: record?.section ?? '',
      capacity: record?.capacity ?? '',
      schoolYearId: record ? String(record.schoolYearId) : currentYear ? String(currentYear.id) : '',
      homeroomTeacherId: record?.homeroomTeacherId ? String(record.homeroomTeacherId) : '',
    },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        // The school year of an existing class is not changed here
        await update.mutateAsync({
          id: record.id,
          body: {
            level: values.level,
            section: values.section,
            capacity: values.capacity,
            homeroomTeacherId: values.homeroomTeacherId ? Number(values.homeroomTeacherId) : null,
          },
        });
        toast.success('Classe modifiée.');
      } else {
        if (!values.schoolYearId) {
          setError('schoolYearId', { message: 'Choisis l’année scolaire.' });
          return;
        }
        const body = {
          level: values.level,
          section: values.section,
          capacity: values.capacity,
          schoolYearId: Number(values.schoolYearId),
        };
        if (values.homeroomTeacherId) body.homeroomTeacherId = Number(values.homeroomTeacherId);
        await create.mutateAsync(body);
        toast.success('Classe créée.');
      }
      onClose();
    } catch (err) {
      setServerError(messageFor(err));
    }
  };

  if (!isEdit && years.length === 0) {
    return <Alert tone="info">Aucune année scolaire n’existe encore : crée-en une avant de créer une classe.</Alert>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Niveau"
          hint="Par exemple CP, CE1, CE2."
          autoComplete="off"
          error={errors.level?.message}
          {...register('level')}
        />
        <TextField
          label="Section"
          hint="Par exemple A, B."
          autoComplete="off"
          error={errors.section?.message}
          {...register('section')}
        />
      </div>

      <TextField
        label="Capacité"
        type="number"
        inputMode="numeric"
        min={1}
        max={60}
        error={errors.capacity?.message}
        {...register('capacity', { valueAsNumber: true })}
      />

      {isEdit ? (
        <p>
          <span className="text-ink/70">Année scolaire : </span>
          <strong>{record.schoolYear?.label ?? '—'}</strong>
        </p>
      ) : (
        <SelectField label="Année scolaire" error={errors.schoolYearId?.message} {...register('schoolYearId')}>
          <option value="">Choisir…</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
              {y.isCurrent ? ' (en cours)' : ''}
            </option>
          ))}
        </SelectField>
      )}

      <SelectField label="Titulaire" hint="Facultatif." {...register('homeroomTeacherId')}>
        <option value="">Aucun pour l’instant</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {teacherName(t)}
          </option>
        ))}
      </SelectField>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Enregistrer' : 'Créer la classe'}
        </Button>
      </div>
    </form>
  );
}

export default function ClassFormModal({ open, record, onClose }) {
  const years = useSchoolYears();
  const teachers = useTeacherOptions();
  const failed = years.error ?? teachers.error;
  const loading = years.isPending || teachers.isPending;

  return (
    <Modal open={open} onClose={onClose} title={record ? 'Modifier la classe' : 'Nouvelle classe'}>
      {failed ? (
        <Alert tone="danger" title="Impossible de charger les données">
          <p>{failed.message}</p>
        </Alert>
      ) : loading ? (
        <div role="status" aria-label="Chargement" className="h-40 animate-pulse rounded-xl bg-ink/10" />
      ) : (
        <ClassForm record={record} years={years.data} teachers={teachers.data} onClose={onClose} />
      )}
    </Modal>
  );
}