import { useEffect, useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextAreaField from '../../components/ui/TextAreaField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from './errors.js';
import { roleLabel } from './format.js';
import { useAudiences, useContacts, useMessageMutations } from './hooks.js';

const groupLabel = {
  CLASS: 'Une classe (les élèves)',
  ALL_TEACHERS: 'Tous les enseignants',
  ALL_PARENTS: 'Tous les parents',
  EVERYONE: 'Tout le monde',
};

const groupHint = {
  CLASS: 'Le message part à tous les élèves de la classe choisie.',
  ALL_TEACHERS: 'Le message part à tous les enseignants de l’école.',
  ALL_PARENTS: 'Le message part à tous les parents concernés.',
  EVERYONE: 'Le message part à tout le monde. Chaque personne ne voit que son propre nom dans la liste des destinataires.',
};

function Composer({ record, onClose }) {
  const isDraft = record?.status === 'DRAFT';
  const toast = useToast();
  const { send, updateDraft, sendDraft } = useMessageMutations();
  const audiences = useAudiences();

  const [mode, setMode] = useState('USERS'); // USERS | CLASS | ALL_TEACHERS | ALL_PARENTS | EVERYONE
  const [classId, setClassId] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState(
    () => new Map((record?.recipients ?? []).map((r) => [r.userId, { name: r.name, role: r.role }])),
  );
  const [subject, setSubject] = useState(record?.subject ?? '');
  const [body, setBody] = useState(record?.body ?? '');
  const [important, setImportant] = useState(Boolean(record?.important));
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const options = audiences.data;
  const groups = options?.groups ?? [];
  const contacts = useContacts({ role: roleFilter, search: debounced }, mode === 'USERS');
  const list = contacts.data ?? [];

  const toggle = (c) =>
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(c.userId)) next.delete(c.userId);
      else next.set(c.userId, { name: c.name, role: c.role });
      return next;
    });

  const validate = () => {
    if (!body.trim()) return 'Écris ton message.';
    if (!subject.trim()) return 'Donne un objet à ton message.';
    if (mode === 'USERS' && selected.size === 0) return 'Choisis au moins un destinataire.';
    if (mode === 'CLASS' && !classId) return 'Choisis une classe.';
    return null;
  };

  const content = () => ({ subject: subject.trim(), body: body.trim(), important });
  const target = () => {
    if (mode === 'USERS') return { recipientIds: [...selected.keys()] };
    if (mode === 'CLASS') return { audience: { type: 'CLASS', classId: Number(classId) } };
    return { audience: { type: mode } };
  };

  const run = async (action, success) => {
    setServerError(null);
    const error = validate();
    if (error) { setServerError(error); return; }
    setSaving(true);
    try {
      await action();
      toast.success(success);
      onClose();
    } catch (err) {
      setServerError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = () =>
    run(async () => {
      const payload = { ...content(), ...target() };
      if (isDraft) await updateDraft.mutateAsync({ id: record.id, body: payload });
      else await send.mutateAsync({ ...payload, draft: true });
    }, 'Brouillon enregistré.');

  const submitSend = () =>
    run(async () => {
      if (isDraft) {
        await updateDraft.mutateAsync({ id: record.id, body: { ...content(), ...target() } });
        await sendDraft.mutateAsync(record.id);
      } else {
        await send.mutateAsync({ ...content(), ...target(), draft: false });
      }
    }, 'Message envoyé.');

  if (audiences.isPending) {
    return <div role="status" aria-label="Chargement" className="h-40 animate-pulse rounded-xl bg-ink/10" />;
  }
  if (audiences.error) return <Alert tone="danger">{audiences.error.message}</Alert>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); submitSend(); }} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      {!isDraft && groups.length > 0 && (
        <SelectField label="Envoyer à" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="USERS">Des personnes (je choisis)</option>
          {groups.map((g) => (<option key={g} value={g}>{groupLabel[g]}</option>))}
        </SelectField>
      )}

      {mode === 'CLASS' && (
        <SelectField label="Classe" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Choisir…</option>
          {(options?.classes ?? []).map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
        </SelectField>
      )}

      {mode !== 'USERS' && <Alert tone="info">{groupHint[mode]}</Alert>}

      {mode === 'USERS' && (
        <fieldset className="space-y-3">
          <legend className="mb-1.5 block font-bold">Destinataires</legend>

          {selected.size > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Destinataires choisis">
              {[...selected].map(([id, s]) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => toggle({ userId: id, ...s })}
                    className="min-h-9 rounded-full bg-sky/15 px-3 text-sm font-bold hover:bg-sky/25"
                    aria-label={`Retirer ${s.name}`}
                  >
                    {s.name} ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Type de personne" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Tous</option>
              {(options?.roles ?? []).map((r) => (<option key={r} value={r}>{roleLabel[r]}</option>))}
            </SelectField>
            <TextField label="Rechercher un nom" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
          </div>

          {contacts.error && <Alert tone="danger">{contacts.error.message}</Alert>}
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border-2 border-ink/15 bg-paper p-2">
            {contacts.isPending ? (
              <li className="p-3 text-ink/70">Chargement…</li>
            ) : list.length === 0 ? (
              <li className="p-3 text-ink/70">Aucune personne trouvée.</li>
            ) : (
              list.map((c) => (
                <li key={c.userId}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-ink/5">
                    <input type="checkbox" className="size-5 shrink-0" checked={selected.has(c.userId)} onChange={() => toggle(c)} />
                    <span>
                      <span className="font-bold">{c.name}</span>
                      <span className="ms-2 text-sm text-ink/70">({roleLabel[c.role]})</span>
                    </span>
                  </label>
                </li>
              ))
            )}
          </ul>
          {list.length >= 100 && <p className="text-sm text-ink/70">Seuls les 100 premiers résultats sont affichés : utilise la recherche.</p>}
        </fieldset>
      )}

      <TextField label="Objet" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />

      <TextAreaField label="Message" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={6} />

      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" className="mt-1 size-5 shrink-0" checked={important} onChange={(e) => setImportant(e.target.checked)} />
        <span>
          <span className="font-bold">Marquer comme important</span>
          <span className="block text-sm text-ink/70">Les destinataires recevront aussi un e-mail.</span>
        </span>
      </label>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        {mode === 'USERS' && (
          <Button variant="ghost" onClick={saveDraft} loading={saving} disabled={saving}>Enregistrer le brouillon</Button>
        )}
        <Button type="submit" loading={saving} disabled={saving}>Envoyer</Button>
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