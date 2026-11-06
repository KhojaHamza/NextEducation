import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from './errors.js';
import { useSchoolYearMutations } from './hooks.js';

const schema = z
  .object({
    label: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Saisis le libellé au format 2026-2027.'),
    startDate: z.string().min(1, 'Choisis la date de début.'),
    endDate: z.string().min(1, 'Choisis la date de fin.'),
    isCurrent: z.boolean(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate < v.endDate, {
    path: ['endDate'],
    message: 'La date de fin doit être après la date de début.',
  });

function SchoolYearForm({ record, onClose }) {
  const isEdit = Boolean(record);
  const toast = useToast();
  const { create, update } = useSchoolYearMutations();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      label: record?.label ?? '',
      startDate: record?.startDate?.slice(0, 10) ?? '',
      endDate: record?.endDate?.slice(0, 10) ?? '',
      isCurrent: false,
    },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    const body = { label: values.label, startDate: values.startDate, endDate: values.endDate };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: record.id, body });
        toast.success('Année scolaire modifiée.');
      } else {
        if (values.isCurrent) body.isCurrent = true;
        await create.mutateAsync(body);
        toast.success('Année scolaire créée.');
      }
      onClose();
    } catch (err) {
      setServerError(messageFor(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <TextField
        label="Libellé"
        hint="Par exemple 2026-2027."
        autoComplete="off"
        error={errors.label?.message}
        {...register('label')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Date de début" type="date" error={errors.startDate?.message} {...register('startDate')} />
        <TextField label="Date de fin" type="date" error={errors.endDate?.message} {...register('endDate')} />
      </div>

      {!isEdit && (
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 shrink-0" {...register('isCurrent')} />
          <span>
            <span className="font-bold">Définir comme année en cours</span>
            <span className="block text-sm text-ink/70">L’année actuellement en cours sera remplacée.</span>
          </span>
        </label>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Enregistrer' : 'Créer l’année'}
        </Button>
      </div>
    </form>
  );
}

export default function SchoolYearFormModal({ open, record, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={record ? 'Modifier l’année scolaire' : 'Nouvelle année scolaire'}>
      <SchoolYearForm record={record} onClose={onClose} />
    </Modal>
  );
}