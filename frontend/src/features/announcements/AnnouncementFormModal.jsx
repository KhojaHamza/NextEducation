import { useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import TextAreaField from '../../components/ui/TextAreaField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { roleLabel } from '../messages/format.js';
import { messageFor } from './errors.js';
import { useAnnouncementMutations } from './hooks.js';

const ROLES = ['TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT'];

function AnnouncementForm({ onClose }) {
  const toast = useToast();
  const { create } = useAnnouncementMutations();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audienceAll, setAudienceAll] = useState(true);
  const [roles, setRoles] = useState([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const toggleRole = (role) =>
    setRoles((list) => (list.includes(role) ? list.filter((r) => r !== role) : [...list, role]));

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);

    if (title.trim().length < 3) { setServerError('L’objet doit faire au moins 3 caractères.'); return; }
    if (body.trim().length < 3) { setServerError('Le message doit faire au moins 3 caractères.'); return; }
    if (!audienceAll && roles.length === 0) { setServerError('Choisis au moins un public.'); return; }

    setSaving(true);
    try {
      await create.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        audience: audienceAll ? 'ALL' : roles,
        sendEmail,
      });
      toast.success('Annonce publiée.');
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
        label="Objet"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={150}
        hint="Résumé en une phrase."
      />

      <TextAreaField
        label="Message"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        maxLength={5000}
      />

      <fieldset>
        <legend className="mb-1.5 block font-bold">Public concerné</legend>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="size-5" checked={audienceAll} onChange={(e) => setAudienceAll(e.target.checked)} />
          <span className="font-bold">Tout le monde</span>
        </label>
        {!audienceAll && (
          <ul className="ms-8 space-y-1">
            {ROLES.map((role) => (
              <li key={role}>
                <label className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" className="size-5" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                  {roleLabel[role]}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" className="mt-1 size-5" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
        <span>
          <span className="font-bold">Envoyer aussi par e-mail</span>
          <span className="block text-sm text-ink/70">Chaque personne reçoit une notification dans l’application et, si coché, un e-mail.</span>
        </span>
      </label>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit" loading={saving}>Publier</Button>
      </div>
    </form>
  );
}

export default function AnnouncementFormModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle annonce" size="lg">
      <AnnouncementForm onClose={onClose} />
    </Modal>
  );
}