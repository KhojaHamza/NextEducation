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
import { useRoomMutations } from './hooks.js';

const schema = z.object({
  name: z.string().trim().min(1, 'Saisis le nom de la salle.').max(50, 'Le nom est trop long (50 caractères au plus).'),
  capacity: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Saisis un nombre entier.')
    .refine((v) => Number(v) >= 1 && Number(v) <= 200, 'La capacité doit être entre 1 et 200.'),
  isAvailable: z.boolean(),
});

function RoomForm({ record, onClose }) {
  const isEdit = Boolean(record);
  const toast = useToast();
  const { create, update } = useRoomMutations();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: record?.name ?? '',
      capacity: record ? String(record.capacity) : '',
      isAvailable: record?.isAvailable ?? true,
    },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    const body = { name: values.name, capacity: Number(values.capacity), isAvailable: values.isAvailable };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: record.id, body });
        toast.success('Salle modifiée.');
      } else {
        await create.mutateAsync(body);
        toast.success('Salle créée.');
      }
      onClose();
    } catch (err) {
      setServerError(messageFor(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <TextField label="Nom" hint="Par exemple Salle 1 ou Salle de sport." autoComplete="off" error={errors.name?.message} {...register('name')} />
      <TextField label="Capacité" type="number" inputMode="numeric" error={errors.capacity?.message} {...register('capacity')} />

      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" className="mt-1 size-5 shrink-0" {...register('isAvailable')} />
        <span>
          <span className="font-bold">Salle disponible</span>
          <span className="block text-sm text-ink/70">Une salle indisponible ne peut plus être choisie pour un nouveau créneau.</span>
        </span>
      </label>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Enregistrer' : 'Créer la salle'}
        </Button>
      </div>
    </form>
  );
}

export default function RoomFormModal({ open, record, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={record ? 'Modifier la salle' : 'Nouvelle salle'}>
      <RoomForm record={record} onClose={onClose} />
    </Modal>
  );
}