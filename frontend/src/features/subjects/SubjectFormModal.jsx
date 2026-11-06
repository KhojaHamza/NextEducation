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
import { useSubjectMutations } from './hooks.js';

const schema = z.object({
  name: z.string().trim().min(1, 'Saisis le nom de la matière.').max(80, '80 caractères maximum.'),
  level: z.string().trim().min(1, 'Saisis le niveau.').max(20, '20 caractères maximum.'),
  coefficient: z
    .number({ error: 'Saisis un coefficient (par exemple 2).' })
    .positive('Le coefficient doit être supérieur à 0.')
    .max(99, 'Le coefficient maximum est 99.'),
});

function SubjectForm({ record, onClose }) {
  const isEdit = Boolean(record);
  const toast = useToast();
  const { create, update } = useSubjectMutations();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: record?.name ?? '',
      level: record?.level ?? '',
      coefficient: record ? Number(record.coefficient) : '',
    },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        await update.mutateAsync({ id: record.id, body: { name: values.name, coefficient: values.coefficient } });
        toast.success('Matière modifiée.');
      } else {
        await create.mutateAsync(values);
        toast.success('Matière créée.');
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
        label="Nom de la matière"
        hint="Par exemple Mathématiques."
        autoComplete="off"
        error={errors.name?.message}
        {...register('name')}
      />

      {isEdit ? (
        <p>
          <span className="text-ink/70">Niveau : </span>
          <strong>{record.level}</strong>
        </p>
      ) : (
        <TextField
          label="Niveau"
          hint="Le même que celui de la classe : par exemple CP, CE1, CE2."
          autoComplete="off"
          error={errors.level?.message}
          {...register('level')}
        />
      )}

      <TextField
        label="Coefficient"
        type="number"
        inputMode="decimal"
        step="any"
        hint="Poids de la matière dans la moyenne générale."
        error={errors.coefficient?.message}
        {...register('coefficient', { valueAsNumber: true })}
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Enregistrer' : 'Créer la matière'}
        </Button>
      </div>
    </form>
  );
}

export default function SubjectFormModal({ open, record, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={record ? 'Modifier la matière' : 'Nouvelle matière'}>
      <SubjectForm record={record} onClose={onClose} />
    </Modal>
  );
}