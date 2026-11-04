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
import { usePeopleMutations } from './hooks.js';

const person = {
  email: z.string().trim().min(1, 'Saisis l’adresse e-mail.').email('Cette adresse e-mail n’est pas valide.'),
  lastName: z.string().trim().min(1, 'Saisis le nom.').max(60, '60 caractères maximum.'),
  firstName: z.string().trim().min(1, 'Saisis le prénom.').max(60, '60 caractères maximum.'),
  phone: z.string().trim().max(30, '30 caractères maximum.'),
};

const schemas = {
  teachers: z.object({
    ...person,
    speciality: z.string().trim().max(100, '100 caractères maximum.'),
    hiredAt: z.string(),
  }),
  parents: z.object({
    ...person,
    address: z.string().trim().max(200, '200 caractères maximum.'),
  }),
};

function PersonForm({ config, record, onClose, onCreated }) {
  const isEdit = Boolean(record);
  const toast = useToast();
  const { create, update } = usePeopleMutations(config.resource);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schemas[config.resource]),
    defaultValues: {
      email: record?.user?.email ?? '',
      lastName: record?.user?.lastName ?? '',
      firstName: record?.user?.firstName ?? '',
      phone: record?.user?.phone ?? '',
      ...Object.fromEntries(
        config.fields.map((f) => [
          f.name,
          f.type === 'date' ? (record?.[f.name]?.slice(0, 10) ?? '') : (record?.[f.name] ?? ''),
        ]),
      ),
    },
  });

  const onSubmit = async (values) => {
    setServerError(null);

    const body = { email: values.email, firstName: values.firstName, lastName: values.lastName };
    if (isEdit || values.phone) body.phone = values.phone; // on edit, an empty text clears the value
    for (const f of config.fields) {
      const value = values[f.name];
      if (f.type === 'date') {
        if (value) body[f.name] = value; // an empty date would be refused by the backend
      } else if (isEdit || value) {
        body[f.name] = value;
      }
    }

    try {
      if (isEdit) {
        await update.mutateAsync({ id: record.id, body });
        toast.success('Modifications enregistrées.');
        onClose();
      } else {
        const created = await create.mutateAsync(body);
        onCreated({ email: body.email, tempPassword: created.tempPassword });
      }
    } catch (err) {
      setServerError(messageFor(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Nom" autoComplete="off" error={errors.lastName?.message} {...register('lastName')} />
        <TextField label="Prénom" autoComplete="off" error={errors.firstName?.message} {...register('firstName')} />
      </div>

      <TextField
        label="Adresse e-mail"
        type="email"
        inputMode="email"
        autoComplete="off"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Téléphone"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        hint="Facultatif."
        error={errors.phone?.message}
        {...register('phone')}
      />

      {config.fields.map((f) => (
        <TextField
          key={f.name}
          label={f.label}
          type={f.type}
          hint={f.hint}
          error={errors[f.name]?.message}
          {...register(f.name)}
        />
      ))}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Enregistrer' : 'Créer le compte'}
        </Button>
      </div>
    </form>
  );
}

// The form is only mounted while the window is open, so it always starts from fresh values
export default function PersonFormModal({ config, open, record, onClose, onCreated }) {
  return (
    <Modal open={open} onClose={onClose} title={record ? config.editTitle : config.newLabel}>
      <PersonForm config={config} record={record} onClose={onClose} onCreated={onCreated} />
    </Modal>
  );
}