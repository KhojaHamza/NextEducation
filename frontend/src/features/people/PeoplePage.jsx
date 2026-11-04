import { useState } from 'react';
import { Plus, SearchX } from 'lucide-react';
import { usePagedList } from '../../api/queries.js';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import RowActions from '../../components/ui/RowActions.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDate } from '../students/format.js';
import CredentialsModal from './CredentialsModal.jsx';
import { messageFor } from './errors.js';
import { usePeopleMutations } from './hooks.js';
import PersonFormModal from './PersonFormModal.jsx';

const PAGE_SIZE = 20;

const fullName = (p) => `${p.user?.lastName ?? ''} ${p.user?.firstName ?? ''}`.trim();

export default function PeoplePage({ config }) {
  const toast = useToast();
  const { remove } = usePeopleMutations(config.resource);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = usePagedList(config.resource, { page, limit: PAGE_SIZE, search: debouncedSearch });

  const onSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const openNew = () => setForm({ open: true, record: null });

  const columns = [
    { key: 'name', header: 'Nom', primary: true, render: (p) => fullName(p) },
    { key: 'email', header: 'E-mail', render: (p) => p.user?.email ?? '—' },
    { key: 'phone', header: 'Téléphone', render: (p) => p.user?.phone || '—' },
    ...config.fields.map((f) => ({
      key: f.name,
      header: f.label,
      render: (p) => (p[f.name] ? (f.type === 'date' ? formatDate(p[f.name]) : p[f.name]) : '—'),
    })),
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <RowActions
          label={fullName(p)}
          onEdit={() => setForm({ open: true, record: p })}
          onDelete={() => setDeleting(p)}
        />
      ),
    },
  ];

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Supprimé.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setDeleting(null);
  };

  const empty = debouncedSearch ? (
    <EmptyState icon={SearchX} title="Aucun résultat">
      Vérifie l’orthographe ou essaie avec une partie du nom.
    </EmptyState>
  ) : (
    <EmptyState icon={config.icon} title={config.emptyTitle} action={<Button onClick={openNew}>{config.newLabel}</Button>} />
  );

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" aria-hidden="true" />
            {config.newLabel}
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder="Nom, prénom ou e-mail"
        className="mb-4 max-w-md"
      />

      <div className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined} aria-busy={list.isFetching}>
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

      <PersonFormModal
        config={config}
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
        title="Supprimer cette personne ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>
          {deleting ? fullName(deleting) : ''} sera retiré(e) de la liste et son compte de connexion sera désactivé.
        </p>
      </ConfirmDialog>
    </>
  );
}