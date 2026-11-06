import { useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { formatAmount, toDateInput } from '../fees/format.js';
import { messageFor } from './errors.js';
import { methodOptions, studentName, todayInput } from './format.js';
import { usePaymentMutations } from './hooks.js';

// Only descriptive fields: the amount is never editable (cancel and enter the payment again instead)
function EditForm({ payment, onClose }) {
  const toast = useToast();
  const { update } = usePaymentMutations();
  const [values, setValues] = useState({
    method: payment.method,
    reference: payment.reference ?? '',
    note: payment.note ?? '',
    paidAt: toDateInput(payment.paidAt),
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const change = (key) => (event) => {
    setValues((v) => ({ ...v, [key]: event.target.value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setServerError(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);

    const next = {};
    if (values.method !== 'CASH' && !values.reference.trim()) {
      next.reference = 'Saisis la référence du virement ou du paiement mobile.';
    }
    if (!values.paidAt) next.paidAt = 'Choisis la date du paiement.';
    else if (values.paidAt > todayInput()) next.paidAt = 'La date ne peut pas être dans le futur.';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      await update.mutateAsync({
        id: payment.id,
        body: {
          method: values.method,
          reference: values.reference.trim() || null,
          note: values.note.trim() || null,
          paidAt: values.paidAt,
        },
      });
      toast.success('Paiement modifié.');
      onClose();
    } catch (err) {
      setServerError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <div className="rounded-xl bg-ink/5 p-3">
        <p className="font-bold">
          {payment.receiptNumber} · {formatAmount(payment.amount)}
        </p>
        <p className="text-sm text-ink/70">{studentName(payment.student)}</p>
        <p className="mt-1 text-sm text-ink/70">Le montant ne peut pas être modifié : annule ce paiement puis saisis-le de nouveau.</p>
      </div>

      <SelectField label="Mode de paiement" value={values.method} onChange={change('method')}>
        {methodOptions.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Référence"
        autoComplete="off"
        value={values.reference}
        onChange={change('reference')}
        error={errors.reference}
      />
      <TextField
        label="Date du paiement"
        type="date"
        max={todayInput()}
        value={values.paidAt}
        onChange={change('paidAt')}
        error={errors.paidAt}
      />
      <TextField label="Note" autoComplete="off" value={values.note} onChange={change('note')} />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

export default function EditPaymentModal({ open, payment, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Modifier le paiement">
      {payment && <EditForm payment={payment} onClose={onClose} />}
    </Modal>
  );
}