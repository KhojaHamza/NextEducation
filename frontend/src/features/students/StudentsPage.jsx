import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, SearchX } from 'lucide-react';
import { usePagedList } from '../../api/queries.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { classLabel, formatDate, genderLabel } from './format.js';

const PAGE_SIZE = 20;

const columns = [
  {
    key: 'name',
    header: 'Élève',
    primary: true,
    render: (s) => (
      <Link to={`/admin/eleves/${s.id}`} className="font-bold text-sky hover:underline">
        {s.lastName} {s.firstName}
      </Link>
    ),
  },
  { key: 'matricule', header: 'Matricule' },
  {
    key: 'class',
    header: 'Classe',
    render: (s) =>
      s.enrollments?.length ? (
        s.enrollments.map((e) => classLabel(e.schoolClass)).join(', ')
      ) : (
        <Badge tone="warning">Sans classe</Badge>
      ),
  },
  { key: 'gender', header: 'Genre', render: (s) => <Badge>{genderLabel(s.gender)}</Badge> },
  { key: 'birthDate', header: 'Date de naissance', render: (s) => formatDate(s.birthDate) },
];

export default function StudentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = usePagedList('students', { page, limit: PAGE_SIZE, search: debouncedSearch });

  const onSearch = (value) => {
    setSearch(value);
    setPage(1); // a new search always starts on the first page
  };

  const goToNew = () => navigate('/admin/eleves/nouveau');

  const empty = debouncedSearch ? (
    <EmptyState icon={SearchX} title="Aucun élève trouvé">
      Vérifie l’orthographe ou essaie avec une partie du nom.
    </EmptyState>
  ) : (
    <EmptyState
      icon={GraduationCap}
      title="Aucun élève pour l’instant"
      action={<Button onClick={goToNew}>Ajouter un élève</Button>}
    >
      Les élèves de l’école apparaîtront ici.
    </EmptyState>
  );

  return (
    <>
      <PageHeader
        title="Élèves"
        description="Tous les élèves de l’école."
        actions={
          <Button onClick={goToNew}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvel élève
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder="Nom, prénom ou matricule"
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
    </>
  );
}