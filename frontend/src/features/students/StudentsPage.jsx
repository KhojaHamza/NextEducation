import { useState } from 'react';
import { GraduationCap, SearchX } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePagedList } from '../../api/queries.js';
import Badge from '../../components/ui/Badge.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

const PAGE_SIZE = 20;

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'd MMMM yyyy', { locale: fr });
};

const columns = [
  { key: 'name', header: 'Élève', primary: true, render: (s) => `${s.lastName} ${s.firstName}` },
  { key: 'matricule', header: 'Matricule' },
  {
    key: 'gender',
    header: 'Genre',
    render: (s) => <Badge>{s.gender === 'FEMALE' ? 'Fille' : 'Garçon'}</Badge>,
  },
  { key: 'birthDate', header: 'Date de naissance', render: (s) => formatDate(s.birthDate) },
];

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = usePagedList('students', { page, limit: PAGE_SIZE, search: debouncedSearch });

  const onSearch = (value) => {
    setSearch(value);
    setPage(1); // a new search always starts on the first page
  };

  const empty = debouncedSearch ? (
    <EmptyState icon={SearchX} title="Aucun élève trouvé">
      Vérifie l’orthographe ou essaie avec une partie du nom.
    </EmptyState>
  ) : (
    <EmptyState icon={GraduationCap} title="Aucun élève pour l’instant">
      Les élèves de l’école apparaîtront ici.
    </EmptyState>
  );

  return (
    <>
      <PageHeader title="Élèves" description="Tous les élèves de l’école." />

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