import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { usePagedList } from '../../api/queries.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import RowActions from '../../components/ui/RowActions.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useDebounced } from '../../hooks/useDebounced.js';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../auth/useAuth.js';
import { useSchoolYears } from '../classes/hooks.js';
import { formatDate } from '../students/format.js';
import { messageFor } from './errors.js';
import FeeFormModal from './FeeFormModal.jsx';
import { feeTypeLabel, feeTypeTone, formatAmount } from './format.js';
import { useFeeMutations } from './hooks.js';

// ADMIN creates, edits and deletes; ACCOUNTANT only reads (the backend enforces it too)
export default function FeesPage() {
  const { user } = useAuth();
  const canWrite = user.role === 'ADMIN';
  const toast = useToast();
  const { remove } = useFeeMutations();

  const years = useSchoolYears();
  const yearList = years.data ?? [];
  const [pickedYear, setPickedYear] = useState(null);
  const defaultYear = yearList.find((y) => y.isCurrent) ?? yearList[0];
  const yearId = pickedYear ?? (defaultYear ? String(defaultYear.id) : '');

  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput.trim());
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null);

  const list = usePagedList('fee-items', { page, limit: 20, search, schoolYearId: yearId });

  const openNew = () => setForm({ open: true, record: null });

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Frais supprimé.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setDeleting(null);
  };

  const columns = [
    { key: 'name', header: 'Frais', primary: true, render: (r) => <strong>{r.name}</strong> },
    { key: 'type', header: 'Type', render: (r) => <Badge tone={feeTypeTone[r.type]}>{feeTypeLabel[r.type]}</Badge> },
    { key: 'level', header: 'Niveau', render: (r) => r.level ?? 'Tous les niveaux' },
    { key: 'amount', header: 'Montant', render: (r) => formatAmount(r.amount) },
    { key: 'dueDate', header: 'Échéance', render: (r) => formatDate(r.dueDate) },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
              <RowActions
                label={`le frais ${r.name}`}
                onEdit={() => setForm({ open: true, record: r })}
                onDelete={() => setDeleting(r)}
              />
            ),
          },
        ]
      : []),
  ];

  const empty = (
    <EmptyState
      icon={Wallet}
      title="Aucun frais"
      action={canWrite ? <Button onClick={openNew}>Nouveau frais</Button> : undefined}
    >
      {search ? 'Aucun frais ne correspond à ta recherche.' : 'Aucun frais n’est défini pour cette année scolaire.'}
    </EmptyState>
  );

  return (
    <>
      <PageHeader
        title="Frais scolaires"
        description="Les frais à payer par les élèves, avec leur échéance."
        actions={
          canWrite ? (
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              Nouveau frais
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap gap-4">
        <SelectField
          label="Année scolaire"
          value={yearId}
          disabled={years.isPending || yearList.length === 0}
          onChange={(e) => {
            setPickedYear(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-56"
        >
          {yearList.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
              {y.isCurrent ? ' (en cours)' : ''}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Rechercher"
          value={searchInput}
          autoComplete="off"
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-72"
        />
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

      {canWrite && (
        <>
          <FeeFormModal
            key={form.record?.id ?? 'new'}
            open={form.open}
            record={form.record}
            onClose={() => setForm({ open: false, record: null })}
          />

          <ConfirmDialog
            open={Boolean(deleting)}
            title="Supprimer ce frais ?"
            confirmLabel="Supprimer"
            danger
            onConfirm={confirmDelete}
            onCancel={() => setDeleting(null)}
          >
            <p>« {deleting?.name} » sera retiré des frais de l’année. Impossible dès qu’un paiement existe pour cette année.</p>
          </ConfirmDialog>
        </>
      )}
    </>
  );
}