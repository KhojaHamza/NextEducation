import { useState } from 'react';
import { format } from 'date-fns';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import TextAreaField from '../../components/ui/TextAreaField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from '../homeworks/errors.js';
import { useEventMutations } from './hooks.js';

function EventForm({ initialDate, onClose }) {
  const toast = useToast();
  const { create } = useEventMutations();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);

    const next = {};
    if (!title.trim()) next.title = 'Saisis le titre.';
    if (!date) next.date = 'Choisis la date.';
    if (date && endDate && endDate < date) next.endDate = 'La fin ne peut pas être avant le début.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await create.mutateAsync({
        title: title.trim(),
        date,
        ...(description.trim() && { description: description.trim() }),
        ...(endDate && { endDate }),
      });
      toast.success('Événement ajouté au calendrier.');
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

      <TextField
        label="Titre"
        hint="Par exemple Sortie scolaire, Vacances d’hiver."
        autoComplete="off"
        maxLength={150}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <TextField
          label="Date de fin (facultatif)"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          error={errors.endDate}
        />
      </div>

      <TextAreaField
        label="Description (facultatif)"
        rows={4}
        maxLength={2000}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          Ajouter
        </Button>
      </div>
    </form>
  );
}

export default function EventFormModal({ open, initialDate, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Nouvel événement">
      <EventForm initialDate={initialDate} onClose={onClose} />
    </Modal>
  );
}