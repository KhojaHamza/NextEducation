import { useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from './errors.js';
import { formatAbsenceDate, periodLabel, studentName } from './format.js';
import { useAbsenceMutations } from './hooks.js';
import NoteField from './NoteField.jsx';
import StatusBadge from './StatusBadge.jsx';

function ReviewForm({ absence, onClose }) {
  const toast = useToast();
  const { review } = useAbsenceMutations();
  const [decision, setDecision] = useState('ACCEPTED');
  const [note, setNote] = useState('');
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);
    setSaving(true);
    const body = { decision };
    if (note.trim()) body.note = note.trim();
    try {
      await review.mutateAsync({ id: absence.id, body });
      toast.success(decision === 'ACCEPTED' ? 'Absence justifiée.' : 'Justificatif refusé.');
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

      <dl className="space-y-2 rounded-xl bg-ink/5 p-4">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-ink/70">Élève</dt>
          <dd className="font-bold">{studentName(absence.student)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-ink/70">Absence</dt>
          <dd className="font-bold">
            {formatAbsenceDate(absence.date)} · {periodLabel[absence.period].toLowerCase()}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-ink/70">Statut actuel</dt>
          <dd>
            <StatusBadge status={absence.justificationStatus} />
          </dd>
        </div>
        {absence.justificationReason && (
          <div>
            <dt className="text-ink/70">Motif transmis</dt>
            <dd className="mt-1 whitespace-pre-line font-bold">{absence.justificationReason}</dd>
          </div>
        )}
      </dl>

      <fieldset>
        <legend className="mb-2 font-bold">Décision</legend>
        <div className="space-y-1">
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="decision"
              className="size-5"
              checked={decision === 'ACCEPTED'}
              onChange={() => setDecision('ACCEPTED')}
            />
            <span>Accepter : l’absence est justifiée</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="decision"
              className="size-5"
              checked={decision === 'REJECTED'}
              onChange={() => setDecision('REJECTED')}
            />
            <span>Refuser : l’absence reste non justifiée</span>
          </label>
        </div>
      </fieldset>

      <NoteField
        label="Note (facultatif)"
        hint="Visible par le parent, par exemple la raison du refus."
        value={note}
        onChange={setNote}
        maxLength={300}
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          Enregistrer la décision
        </Button>
      </div>
    </form>
  );
}

// Mounted only while open: the form always starts empty
export default function ReviewModal({ open, absence, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Traiter l’absence">
      {absence && <ReviewForm absence={absence} onClose={onClose} />}
    </Modal>
  );
}