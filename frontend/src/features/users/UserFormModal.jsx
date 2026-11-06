import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useAuth } from '../auth/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from './errors.js';
import { roleOptions } from './format.js';
import { useUserMutations } from './hooks.js';

const baseSchema = {
  email: z
    .string()
    .trim()
    .min(1, 'Saisis l’adresse e-mail.')
    .email('Adresse e-mail invalide.'),
  role: z.enum(['ADMIN', 'TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT']),
  firstName: z.string().trim().min(1, 'Saisis le prénom.').max(60, '60 caractères maximum.'),
  lastName: z.string().trim().min(1, 'Saisis le nom.').max(60, '60 caractères maximum.'),
  phone: z
    .string()
    .trim()
    .max(30, '30 caractères maximum.')
    .optional()
    .or(z.literal('')),
};

const createSchema = z.object({ ...baseSchema });
const editSchema = z.object({ ...baseSchema, isActive: z.boolean() });

function UserForm({ record, onCreated, onClose }) {
  const isEdit = Boolean(record);
  const { user: me } = useAuth();
  const toast = useToast();
  const { create, update } = useUserMutations();
  const [serverError, setServerError] = useState(null);

  const schema = isEdit ? editSchema : createSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: record?.email ?? '',
      role: record?.role ?? 'STUDENT',
      firstName: record?.firstName ?? '',
      lastName: record?.lastName ?? '',
      phone: record?.phone ?? '',
      isActive: record?.isActive ?? true,
    },
  });

  const onSubmit = async (values) => {
    setServerError(null);

    const body = {
      email: values.email,
      role: values.role,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || undefined,
    };

    try {
      if (isEdit) {
        if (record.id === me.id && (values.isActive === false || values.role !== me.role)) {
          setServerError('Tu ne peux pas modifier ton propre rôle ni désactiver ton compte.');
          return;
        }
        await update.mutateAsync({ id: record.id, body: { ...body, isActive: values.isActive } });
        toast.success('Utilisateur modifié.');
        onClose();
      } else {
        const result = await create.mutateAsync(body);
        toast.success('Utilisateur créé.');
        if (onCreated) {
          // Some backends return { data: {...}, temporaryPassword }, others { user: {...} }
          const user = result?.data ?? result?.user ?? result;
          const temporaryPassword =
            result?.temporaryPassword ?? result?.password ?? result?.tempPassword ?? '';
          onCreated({ user, email: user?.email ?? body.email, temporaryPassword });
        } else {
          onClose();
        }
      }
    } catch (err) {
      setServerError(messageFor(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <TextField
        label="Adresse e-mail"
        type="email"
        inputMode="email"
        autoComplete="off"
        hint="Sert d’identifiant de connexion."
        error={errors.email?.message}
        {...register('email')}
      />

      <SelectField label="Rôle" error={errors.role?.message} {...register('role')}>
        {roleOptions.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </SelectField>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Prénom" autoComplete="off" error={errors.firstName?.message} {...register('firstName')} />
        <TextField label="Nom" autoComplete="off" error={errors.lastName?.message} {...register('lastName')} />
      </div>

      <TextField
        label="Téléphone"
        hint="Facultatif."
        autoComplete="off"
        error={errors.phone?.message}
        {...register('phone')}
      />

      {isEdit && (
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 shrink-0" {...register('isActive')} />
          <span>
            <span className="font-bold">Compte actif</span>
            <span className="block text-sm text-ink/70">Un compte inactif ne peut plus se connecter.</span>
          </span>
        </label>
      )}

      {!isEdit && (
        <Alert tone="info">
          Un mot de passe temporaire sera généré et affiché une seule fois après la création.
        </Alert>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Enregistrer' : 'Créer l’utilisateur'}
        </Button>
      </div>
    </form>
  );
}

export default function UserFormModal({ open, record, onClose, onCreated }) {
  return (
    <Modal open={open} onClose={onClose} title={record ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}>
      {open && <UserForm record={record} onCreated={onCreated} onClose={onClose} />}
    </Modal>
  );
}