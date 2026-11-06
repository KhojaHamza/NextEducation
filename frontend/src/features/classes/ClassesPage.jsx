import { useState } from 'react';
import { Plus, School, SearchX } from 'lucide-react';
import { usePagedList } from '../../api/queries.js';
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
import { classLabel } from '../students/format.js';
import ClassFormModal from './ClassFormModal.jsx';
import { messageFor } from './errors.js';
import { teacherName, useClassMutations, useSchoolYears, useTeacherOptions } from './hooks.js';

const PAGE_SIZE = 20;

export default function ClassesPage() {
  const toast = useToast();
  const { remove } = useClassMutations();
  const [search, setSearch] = useState('');
  const [yearId, setYearId] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const years = useSchoolYears();
  const teachers = useTeacherOptions();
  const list = usePagedList('classes', { page, limit: PAGE_SIZE, search: debouncedSearch, schoolYearId: yearId });

  // The class list only carries the homeroom teacher's id: names come from the teacher list
  const teacherNames = new Map((teachers.data ?? []).map((t) => [t.id, teacherName(t)]));

  const onSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const onYear = (value) => {
    setYearId(value);
    setPage(1);
  };

  const openNew = () => setForm({ open: true, record: null });

  const columns = [
    { key: 'name', header: 'Classe', primary: true, render: (c) => <strong>{classLabel(c)}</strong> },
    { key: 'year', header: 'Année scolaire', render: (c) => c.schoolYear?.label ?? '—' },
    { key: 'capacity', header: 'Capacité' },
    {
      key: 'teacher',
      header: 'Titulaire',
      render: (c) => (c.homeroomTeacherId ? (teacherNames.get(c.homeroomTeacherId) ?? '—') : '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <RowActions
          label={`la classe ${classLabel(c)}`}
          onEdit={() => setForm({ open: true, record: c })}
          onDelete={() => setDeleting(c)}
        />
      ),
    },
  ];

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Classe supprimée.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setDeleting(null);
  };

  const empty =
    debouncedSearch || yearId ? (
      <EmptyState icon={SearchX} title="Aucune classe trouvée">
        Change la recherche ou l’année scolaire.
      </EmptyState>
    ) : (
      <EmptyState icon={School} title="Aucune classe pour l’instant" action={<Button onClick={openNew}>Nouvelle classe</Button>}>
        Les classes de l’école apparaîtront ici.
      </EmptyState>
    );

  return (
    <>
      <PageHeader
        title="Classes"
        description="Les classes de chaque année scolaire."
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle classe
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <SearchInput value={search} onChange={onSearch} placeholder="Niveau ou section" className="w-full max-w-md" />
        <SelectField label="Année scolaire" value={yearId} onChange={(e) => onYear(e.target.value)} className="w-full max-w-xs">
          <option value="">Toutes les années</option>
          {(years.data ?? []).map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
              {y.isCurrent ? ' (en cours)' : ''}
            </option>
          ))}
        </SelectField>
      </div>

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

      <ClassFormModal
        open={form.open}
        record={form.record}
        onClose={() => setForm({ open: false, record: null })}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Supprimer cette classe ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>La classe {deleting ? classLabel(deleting) : ''} sera retirée de la liste.</p>
      </ConfirmDialog>
    </>
  );
}