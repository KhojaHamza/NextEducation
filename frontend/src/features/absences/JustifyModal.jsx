import { useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from './errors.js';
import { formatAbsenceDate, periodLabel, studentName } from './format.js';
import { useAbsenceMutations } from './hooks.js';
import NoteField from './NoteField.jsx';

function JustifyForm({ absence, onClose }) {
  const toast = useToast();
  const { justify } = useAbsenceMutations();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);
    const text = reason.trim();
    if (text.length < 3) {
      setError('Explique la raison de l’absence en quelques mots (3 caractères au moins).');
      return;
    }
    setSaving(true);
    try {
      await justify.mutateAsync({ id: absence.id, reason: text });
      toast.success('Justificatif envoyé. L’école va le traiter.');
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
        {studentName(absence.student)} · {formatAbsenceDate(absence.date)} · {periodLabel[absence.period].toLowerCase()}
      </p>

      {absence.justificationStatus === 'REJECTED' && (
        <Alert tone="info" title="Le précédent justificatif a été refusé">
          {absence.reviewNote ? <p>{absence.reviewNote}</p> : <p>Tu peux en envoyer un nouveau.</p>}
        </Alert>
      )}

      <NoteField
        label="Raison de l’absence"
        hint="Par exemple : rendez-vous médical, maladie, raison familiale."
        value={reason}
        error={error}
        maxLength={500}
        onChange={(value) => {
          setReason(value);
          setError(null);
        }}
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          Envoyer le justificatif
        </Button>
      </div>
    </form>
  );
}

// Mounted only while open: the form always starts empty
export default function JustifyModal({ open, absence, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Justifier l’absence">
      {absence && <JustifyForm absence={absence} onClose={onClose} />}
    </Modal>
  );
}