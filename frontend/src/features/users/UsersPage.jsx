import { useState } from 'react';
import { KeyRound, Plus, SearchX, UserCog } from 'lucide-react';
import { usePagedList } from '../../api/queries.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import RowActions from '../../components/ui/RowActions.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../auth/useAuth.js';
import CredentialsModal from './CredentialsModal.jsx';
import { messageFor } from './errors.js';
import { fullName, roleLabel, roleOptions } from './format.js';
import { useUserMutations } from './hooks.js';
import UserFormModal from './UserFormModal.jsx';

const PAGE_SIZE = 20;

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { remove, resetPassword } = useUserMutations();
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // <-- Nouvel état pour le filtre
  const [page, setPage] = useState(1);
  
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [resetting, setResetting] = useState(null);
  
  const debouncedSearch = useDebouncedValue(search.trim());

  // On ajoute `role: roleFilter` aux paramètres de la requête
  const list = usePagedList('users', { 
    page, 
    limit: PAGE_SIZE, 
    search: debouncedSearch,
    role: roleFilter 
  });

  const openNew = () => setForm({ open: true, record: null });
  
  const onSearch = (v) => {
    setSearch(v);
    setPage(1);
  };

  const onRoleChange = (e) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Utilisateur supprimé.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setDeleting(null);
  };

  const confirmReset = async () => {
    try {
      const result = await resetPassword.mutateAsync(resetting.id);
      const user = result?.data ?? result?.user ?? resetting;
      const temporaryPassword =
        result?.temporaryPassword ?? result?.password ?? result?.tempPassword ?? '';
      setCredentials({ user, email: user?.email ?? resetting.email, temporaryPassword });
      toast.success('Mot de passe réinitialisé.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setResetting(null);
  };

  const columns = [
    { key: 'name', header: 'Nom', primary: true, render: (u) => <strong>{fullName(u)}</strong> },
    { key: 'email', header: 'E-mail', render: (u) => u.email },
    {
      key: 'role',
      header: 'Rôle',
      render: (u) => <Badge tone="info">{roleLabel[u.role] ?? u.role}</Badge>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (u) =>
        u.isActive ? <Badge tone="success">Actif</Badge> : <Badge tone="warning">Désactivé</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => setResetting(u)}
            aria-label={`Réinitialiser le mot de passe de ${fullName(u)}`}
            className="grid size-11 place-items-center rounded-xl hover:bg-ink/5"
          >
            <KeyRound className="size-5" aria-hidden="true" />
          </button>
          <RowActions
            label={fullName(u)}
            onEdit={() => setForm({ open: true, record: u })}
            onDelete={u.id === me.id ? undefined : () => setDeleting(u)}
          />
        </div>
      ),
    },
  ];

  const empty = debouncedSearch || roleFilter ? (
    <EmptyState icon={SearchX} title="Aucun utilisateur trouvé">
      Essaie de modifier ta recherche ou ton filtre.
    </EmptyState>
  ) : (
    <EmptyState
      icon={UserCog}
      title="Aucun utilisateur"
      action={<Button onClick={openNew}>Nouvel utilisateur</Button>}
    >
      Les comptes que tu crées ici peuvent se connecter avec l’adresse e-mail et le mot de passe généré.
    </EmptyState>
  );

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Les comptes qui peuvent se connecter à l’application."
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvel utilisateur
          </Button>
        }
      />

      {/* Barre de recherche et filtre côte à côte */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder="Nom, prénom ou e-mail"
          className="flex-1 min-w-[250px]"
        />
        <SelectField
          value={roleFilter}
          onChange={onRoleChange}
          className="w-full sm:w-56"
        >
          <option value="">Tous les rôles</option>
          {roleOptions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div
        className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}
        aria-busy={list.isFetching}
      >
        <DataTable
          columns={columns}
          rows={list.data?.data ?? []}
          loading={list.isPending}
          error={list.error}
          onRetry={list.refetch}
          empty={empty}
        />
      </div>

      <Pagination meta={list.data?.meta} onPageChange={setPage} />

      <UserFormModal
        open={form.open}
        record={form.record}
        onClose={() => setForm({ open: false, record: null })}
        onCreated={(created) => {
          setForm({ open: false, record: null });
          setCredentials(created);
        }}
      />

      <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Supprimer cet utilisateur ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>
          {deleting ? fullName(deleting) : ''} ne pourra plus se connecter. Ses données restent conservées.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(resetting)}
        title="Réinitialiser le mot de passe ?"
        confirmLabel="Réinitialiser"
        onConfirm={confirmReset}
        onCancel={() => setResetting(null)}
      >
        <p>
          Un nouveau mot de passe temporaire sera généré pour{' '}
          {resetting ? fullName(resetting) : ''}. La personne devra le changer à sa prochaine connexion.
        </p>
      </ConfirmDialog>
    </>
  );
}