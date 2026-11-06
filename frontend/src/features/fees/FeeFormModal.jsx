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
import { useSchoolYears } from '../classes/hooks.js';
import { messageFor } from './errors.js';
import { feeTypeLabel, formatAmount, toDateInput } from './format.js';
import { useFeeMutations } from './hooks.js';

const schema = z.object({
  name: z.string().trim().min(1, 'Saisis le nom du frais.').max(100, '100 caractères maximum.'),
  type: z.enum(['REGISTRATION', 'TUITION', 'OTHER']),
  level: z.string().trim().max(20, '20 caractères maximum.'),
  amount: z
    .number({ error: 'Saisis un montant (par exemple 150).' })
    .positive('Le montant doit être supérieur à 0.')
    .max(1_000_000, 'Le montant maximum est 1 000 000.')
    .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6, '3 décimales au maximum.'),
  dueDate: z.string().min(1, 'Choisis la date d’échéance.'),
  schoolYearId: z.string(),
});

function FeeForm({ record, onClose }) {
  const isEdit = Boolean(record);
  const toast = useToast();
  const years = useSchoolYears();
  const { create, update } = useFeeMutations();
  const [serverError, setServerError] = useState(null);

  const yearList = years.data ?? [];
  const currentYear = yearList.find((y) => y.isCurrent) ?? yearList[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: record?.name ?? '',
      type: record?.type ?? 'TUITION',
      level: record?.level ?? '',
      amount: record ? Number(record.amount) : '',
      dueDate: toDateInput(record?.dueDate),
      schoolYearId: record ? String(record.schoolYearId) : '',
    },
  });

  const type = watch('type');
  // The year defaults to the current one until the person picks another
  const yearId = watch('schoolYearId') || (currentYear ? String(currentYear.id) : '');

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        // Only send what changed: once payments exist, the backend refuses any change of amount, level, type or year
        const body = { name: values.name, dueDate: values.dueDate };
        if (values.type !== record.type) body.type = values.type;
        if (values.amount !== Number(record.amount)) body.amount = values.amount;
        if ((values.level || null) !== (record.level ?? null)) body.level = values.level || null;
        await update.mutateAsync({ id: record.id, body });
        toast.success('Frais modifié.');
      } else {
        if (!yearId) {
          setServerError('Choisis l’année scolaire.');
          return;
        }
        await create.mutateAsync({
          name: values.name,
          type: values.type,
          level: values.level || null,
          amount: values.amount,
          dueDate: values.dueDate,
          schoolYearId: Number(yearId),
        });
        toast.success('Frais créé.');
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
        label="Nom du frais"
        hint="Par exemple Scolarité 1er trimestre."
        autoComplete="off"
        error={errors.name?.message}
        {...register('name')}
      />

      <SelectField
        label="Type"
        value={type}
        onChange={(e) => setValue('type', e.target.value, { shouldValidate: true })}
      >
        {Object.entries(feeTypeLabel).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>

      {isEdit ? (
        <p>
          <span className="text-ink/70">Année scolaire : </span>
          <strong>{record.schoolYear?.label}</strong>
        </p>
      ) : (
        <SelectField
          label="Année scolaire"
          value={yearId}
          disabled={years.isPending}
          onChange={(e) => setValue('schoolYearId', e.target.value)}
        >
          {yearList.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
              {y.isCurrent ? ' (en cours)' : ''}
            </option>
          ))}
        </SelectField>
      )}

      <TextField
        label="Niveau"
        hint="Laisse vide pour appliquer ce frais à tous les niveaux. Sinon saisis par exemple CP ou CE1."
        autoComplete="off"
        error={errors.level?.message}
        {...register('level')}
      />

      <TextField
        label="Montant (TND)"
        type="number"
        inputMode="decimal"
        step="any"
        hint={
          isEdit
            ? `Montant actuel : ${formatAmount(record.amount)}. Il n’est plus modifiable dès qu’un paiement existe.`
            : 'Jusqu’à 3 décimales, par exemple 150.500.'
        }
        error={errors.amount?.message}
        {...register('amount', { valueAsNumber: true })}
      />

      <TextField label="Date d’échéance" type="date" error={errors.dueDate?.message} {...register('dueDate')} />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Enregistrer' : 'Créer le frais'}
        </Button>
      </div>
    </form>
  );
}

export default function FeeFormModal({ open, record, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={record ? 'Modifier le frais' : 'Nouveau frais'}>
      <FeeForm record={record} onClose={onClose} />
    </Modal>
  );
}