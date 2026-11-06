import { useMemo, useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextAreaField from '../../components/ui/TextAreaField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useAuth } from '../auth/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from './errors.js';
import { roleLabel } from './format.js';
import { useContacts, useMessageMutations } from './hooks.js';

function Composer({ record, onClose }) {
  const isDraft = record?.status === 'DRAFT';
  const { user } = useAuth();
  const toast = useToast();
  const { send, updateDraft, sendDraft } = useMessageMutations();
  const contacts = useContacts();

  const [subject, setSubject] = useState(record?.subject ?? '');
  const [body, setBody] = useState(record?.body ?? '');
  const [important, setImportant] = useState(Boolean(record?.important));
  const [studentId, setStudentId] = useState(record?.student?.id ? String(record.student.id) : '');
  const [recipientIds, setRecipientIds] = useState(() =>
    record?.recipients ? record.recipients.map((r) => r.userId) : [],
  );
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const needsStudent = user.role === 'TEACHER' || user.role === 'PARENT';

  // Unique students from contacts' students arrays (only for teacher / parent)
  const students = useMemo(() => {
    const map = new Map();
    (contacts.data ?? []).forEach((c) => (c.students || []).forEach((s) => map.set(s.id, s)));
    return [...map.values()];
  }, [contacts.data]);

  // Auto-select when a parent has exactly one child
  const effectiveStudentId = studentId || (students.length === 1 ? String(students[0].id) : '');

  // Filter recipients: teacher sees only parents of the student, parent sees teachers + admins, others see all
  const filtered = useMemo(() => {
    const all = contacts.data ?? [];
    if (user.role === 'ADMIN' || user.role === 'ACCOUNTANT' || user.role === 'STUDENT') return all;
    return all.filter((c) => {
      if (!c.students) return true; // admins, always visible for parents
      if (!effectiveStudentId) return true;
      return c.students.some((s) => s.id === Number(effectiveStudentId));
    });
  }, [contacts.data, effectiveStudentId, user.role]);

  const toggleRecipient = (id) =>
    setRecipientIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const validate = () => {
    if (!body.trim()) return 'Écris ton message.';
    if (!recipientIds.length) return 'Choisis au moins un destinataire.';
    if (!isDraft && !record && !subject.trim()) return 'Donne un objet à ton message.';
    if (needsStudent && !effectiveStudentId) return 'Choisis d’abord l’élève concerné.';
    return null;
  };

  const baseBody = () => ({
    subject: subject.trim() || undefined,
    body: body.trim(),
    recipientIds,
    studentId: effectiveStudentId ? Number(effectiveStudentId) : undefined,
    important,
  });

  const saveDraft = async () => {
    setServerError(null);
    const error = validate();
    if (error) { setServerError(error); return; }
    setSaving(true);
    try {
      if (isDraft) await updateDraft.mutateAsync({ id: record.id, body: baseBody() });
      else await send.mutateAsync({ ...baseBody(), draft: true });
      toast.success('Brouillon enregistré.');
      onClose();
    } catch (err) { setServerError(messageFor(err)); }
    finally { setSaving(false); }
  };

  const submitSend = async () => {
    setServerError(null);
    const error = validate();
    if (error) { setServerError(error); return; }
    setSaving(true);
    try {
      if (isDraft) {
        await updateDraft.mutateAsync({ id: record.id, body: baseBody() });
        await sendDraft.mutateAsync(record.id);
      } else {
        await send.mutateAsync({ ...baseBody(), draft: false });
      }
      toast.success('Message envoyé.');
      onClose();
    } catch (err) { setServerError(messageFor(err)); }
    finally { setSaving(false); }
  };

  const loadError = contacts.error;

  return (
    <form onSubmit={(e) => { e.preventDefault(); submitSend(); }} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      {loadError && <Alert tone="danger">{loadError.message}</Alert>}

      {needsStudent && students.length > 0 && (
        <SelectField
          label="Élève concerné"
          hint="Le message sera rattaché à cet élève."
          value={effectiveStudentId}
          onChange={(e) => { setStudentId(e.target.value); setRecipientIds([]); }}
        >
          <option value="">Choisir un élève…</option>
          {students.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </SelectField>
      )}

      {needsStudent && students.length === 0 && contacts.isSuccess && (
        <Alert tone="info">
          Aucun élève rattaché à ton compte pour l’instant. Contacte l’administration.
        </Alert>
      )}

      <fieldset>
        <legend className="mb-1.5 block font-bold">Destinataires</legend>
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border-2 border-ink/15 bg-paper p-2">
          {filtered.length === 0 ? (
            <li className="p-3 text-ink/70">Aucun destinataire disponible.</li>
          ) : (
            filtered.map((c) => (
              <li key={c.userId}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-ink/5">
                  <input
                    type="checkbox"
                    className="mt-1 size-5 shrink-0"
                    checked={recipientIds.includes(c.userId)}
                    onChange={() => toggleRecipient(c.userId)}
                  />
                  <span>
                    <span className="font-bold">{c.name}</span>
                    <span className="ms-2 text-sm text-ink/70">({roleLabel[c.role]})</span>
                    {c.students && c.students.length > 0 && (
                      <span className="block text-sm text-ink/70">
                        Élève : {c.students.map((s) => s.name).join(', ')}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
      </fieldset>

      <TextField label="Objet" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />

      <TextAreaField
        label="Message"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={5000}
        rows={6}
      />

      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" className="mt-1 size-5 shrink-0" checked={important} onChange={(e) => setImportant(e.target.checked)} />
        <span>
          <span className="font-bold">Marquer comme important</span>
          <span className="block text-sm text-ink/70">Le destinataire recevra aussi un e-mail.</span>
        </span>
      </label>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant="ghost" onClick={saveDraft} loading={saving} disabled={saving}>Enregistrer le brouillon</Button>
        <Button type="submit" loading={saving} disabled={saving}>{isDraft ? 'Envoyer' : 'Envoyer'}</Button>
      </div>
    </form>
  );
}

export default function MessageFormModal({ open, record, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={record ? 'Modifier le brouillon' : 'Nouveau message'} size="lg">
      {open && <Composer record={record} onClose={onClose} />}
    </Modal>
  );
}