import { useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { formatAmount } from '../fees/format.js';
import { messageFor } from './errors.js';
import { studentName } from './format.js';
import { usePaymentMutations } from './hooks.js';

// Administrator only (the backend refuses anyone else)
function CancelForm({ payment, onClose }) {
  const toast = useToast();
  const { cancel } = usePaymentMutations();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);
    const text = reason.trim();
    if (text.length < 3) {
      setError('Saisis le motif de l’annulation (3 caractères au moins).');
      return;
    }
    if (text.length > 300) {
      setError('300 caractères au maximum.');
      return;
    }

    setSaving(true);
    try {
      await cancel.mutateAsync({ id: payment.id, reason: text });
      toast.success('Paiement annulé.');
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

      <p>
        Le paiement <strong>{payment.receiptNumber}</strong> de <strong>{formatAmount(payment.amount)}</strong> ({studentName(payment.student)})
        sera annulé. Le solde de l’élève sera recalculé et ses parents seront prévenus. Le numéro de reçu ne sera pas réutilisé.
      </p>

      <TextField
        label="Motif de l’annulation"
        hint="Par exemple : erreur de saisie."
        autoComplete="off"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setError(null);
        }}
        error={error}
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Garder le paiement
        </Button>
        <Button type="submit" variant="danger" loading={saving}>
          Annuler le paiement
        </Button>
      </div>
    </form>
  );
}

export default function CancelPaymentModal({ open, payment, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Annuler ce paiement ?" size="sm">
      {payment && <CancelForm payment={payment} onClose={onClose} />}
    </Modal>
  );
}