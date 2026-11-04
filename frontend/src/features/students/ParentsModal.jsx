import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { usePagedList } from '../../api/queries.js';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../hooks/useToast.js';
import { relationLabel } from './format.js';
import { linkMessageFor } from './linkErrors.js';
import { useStudentLinks } from './linkHooks.js';

const MAX_PARENTS = 4; // backend limit
const fullName = (user) => (user ? `${user.lastName} ${user.firstName}` : 'Parent');

function ParentsForm({ student, onClose }) {
  const toast = useToast();
  const { setParents } = useStudentLinks();

  const [links, setLinks] = useState(() =>
    (student.parents ?? []).map((l) => ({
      parentId: l.parentId,
      relationship: l.relationship,
      name: fullName(l.parent?.user),
      email: l.parent?.user?.email ?? '',
    })),
  );
  const [search, setSearch] = useState('');
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim());

  const results = usePagedList('parents', { page: 1, limit: 8, search: debouncedSearch });
  const linkedIds = new Set(links.map((l) => l.parentId));
  const candidates = (results.data?.data ?? []).filter((p) => !linkedIds.has(p.id));
  const full = links.length >= MAX_PARENTS;

  const add = (p) =>
    setLinks((list) => [
      ...list,
      { parentId: p.id, relationship: 'guardian', name: fullName(p.user), email: p.user?.email ?? '' },
    ]);

  const remove = (parentId) => setLinks((list) => list.filter((l) => l.parentId !== parentId));

  const changeRelation = (parentId, relationship) =>
    setLinks((list) => list.map((l) => (l.parentId === parentId ? { ...l, relationship } : l)));

  const save = async () => {
    setServerError(null);
    setSaving(true);
    try {
      await setParents.mutateAsync({
        id: student.id,
        parents: links.map((l) => ({ parentId: l.parentId, relationship: l.relationship })),
      });
      toast.success('Parents enregistrés.');
      onClose();
    } catch (err) {
      setServerError(linkMessageFor(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <div>
        <h3 className="mb-2 font-bold">
          Parents liés ({links.length}/{MAX_PARENTS})
        </h3>
        {links.length ? (
          <ul className="space-y-3">
            {links.map((l) => (
              <li key={l.parentId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink/5 p-3">
                <div className="min-w-0">
                  <p className="font-bold">{l.name}</p>
                  <p className="truncate text-sm text-ink/70">{l.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Lien de ${l.name} avec l’élève`}
                    value={l.relationship}
                    onChange={(e) => changeRelation(l.parentId, e.target.value)}
                    className="min-h-11 rounded-xl border-2 border-ink/15 bg-paper px-3 focus:border-sky"
                  >
                    {Object.entries(relationLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(l.parentId)}
                    aria-label={`Retirer ${l.name}`}
                    className="grid size-11 place-items-center rounded-xl hover:bg-ink/10"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucun parent n’est lié pour l’instant.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-bold">Ajouter un parent</h3>
        {full ? (
          <Alert tone="info">Le maximum de {MAX_PARENTS} parents est atteint.</Alert>
        ) : (
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Nom, prénom ou e-mail" />
            <div className="mt-3" aria-busy={results.isFetching}>
              {results.error ? (
                <Alert tone="danger">{results.error.message}</Alert>
              ) : results.isPending ? (
                <div role="status" aria-label="Chargement" className="h-20 animate-pulse rounded-xl bg-ink/10" />
              ) : candidates.length ? (
                <ul className="space-y-2">
                  {candidates.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">{fullName(p.user)}</p>
                        <p className="truncate text-sm text-ink/70">{p.user?.email}</p>
                      </div>
                      <Button variant="secondary" onClick={() => add(p)}>
                        <Plus className="size-4" aria-hidden="true" />
                        Ajouter
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Aucun parent à ajouter. Crée-le d’abord dans « Parents ».</p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={save} loading={saving}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

// Mounted only while open: the list always starts from the student’s current parents
export default function ParentsModal({ open, student, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Parents de l’élève" size="lg">
      <ParentsForm student={student} onClose={onClose} />
    </Modal>
  );
}