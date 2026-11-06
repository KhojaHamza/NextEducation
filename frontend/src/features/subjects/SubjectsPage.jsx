import { useState } from 'react';
import { BookOpen, Plus, SearchX } from 'lucide-react';
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
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from './errors.js';
import { useSubjectMutations } from './hooks.js';
import SubjectFormModal from './SubjectFormModal.jsx';

const PAGE_SIZE = 20;

export default function SubjectsPage() {
  const toast = useToast();
  const { remove } = useSubjectMutations();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = usePagedList('subjects', { page, limit: PAGE_SIZE, search: debouncedSearch });

  const onSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const openNew = () => setForm({ open: true, record: null });

  const columns = [
    { key: 'name', header: 'Matière', primary: true, render: (s) => <strong>{s.name}</strong> },
    { key: 'level', header: 'Niveau', render: (s) => <Badge tone="info">{s.level}</Badge> },
    { key: 'coefficient', header: 'Coefficient', render: (s) => Number(s.coefficient) },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <RowActions
          label={`la matière ${s.name} (${s.level})`}
          onEdit={() => setForm({ open: true, record: s })}
          onDelete={() => setDeleting(s)}
        />
      ),
    },
  ];

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Matière supprimée.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setDeleting(null);
  };

  const empty = debouncedSearch ? (
    <EmptyState icon={SearchX} title="Aucune matière trouvée">
      Vérifie l’orthographe ou essaie avec une partie du nom.
    </EmptyState>
  ) : (
    <EmptyState icon={BookOpen} title="Aucune matière pour l’instant" action={<Button onClick={openNew}>Nouvelle matière</Button>}>
      Crée les matières de chaque niveau avant d’attribuer des enseignants.
    </EmptyState>
  );

  return (
    <>
      <PageHeader
        title="Matières"
        description="Les matières enseignées, par niveau, avec leur coefficient."
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle matière
          </Button>
        }
      />

      <SearchInput value={search} onChange={onSearch} placeholder="Nom de la matière" className="mb-4 max-w-md" />

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

      <SubjectFormModal open={form.open} record={form.record} onClose={() => setForm({ open: false, record: null })} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Supprimer cette matière ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>
          La matière {deleting?.name} ({deleting?.level}) sera retirée de la liste.
        </p>
      </ConfirmDialog>
    </>
  );
}