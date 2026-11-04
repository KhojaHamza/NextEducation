import { useState } from 'react';
import { CalendarDays, CircleCheck, Plus } from 'lucide-react';
import { usePagedList } from '../../api/queries.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import RowActions from '../../components/ui/RowActions.jsx';
import { useToast } from '../../hooks/useToast.js';
import { formatDate } from '../students/format.js';
import { messageFor } from './errors.js';
import { useSchoolYearMutations } from './hooks.js';
import SchoolYearFormModal from './SchoolYearFormModal.jsx';

const PAGE_SIZE = 20;

export default function SchoolYearsPage() {
  const toast = useToast();
  const { update, remove } = useSchoolYearMutations();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null);
  const [switching, setSwitching] = useState(null);

  const list = usePagedList('school-years', { page, limit: PAGE_SIZE });

  const openNew = () => setForm({ open: true, record: null });

  const columns = [
    { key: 'label', header: 'Année', primary: true, render: (y) => <strong>{y.label}</strong> },
    {
      key: 'period',
      header: 'Période',
      render: (y) => `${formatDate(y.startDate)} → ${formatDate(y.endDate)}`,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (y) =>
        y.isCurrent ? (
          <Badge tone="success" icon={CircleCheck}>
            En cours
          </Badge>
        ) : (
          '—'
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (y) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!y.isCurrent && (
            <Button variant="ghost" onClick={() => setSwitching(y)}>
              Définir en cours
            </Button>
          )}
          <RowActions
            label={`l’année ${y.label}`}
            onEdit={() => setForm({ open: true, record: y })}
            onDelete={y.isCurrent ? undefined : () => setDeleting(y)}
          />
        </div>
      ),
    },
  ];

  const confirmSwitch = async () => {
    try {
      await update.mutateAsync({ id: switching.id, body: { isCurrent: true } });
      toast.success(`L’année ${switching.label} est maintenant l’année en cours.`);
    } catch (err) {
      toast.error(messageFor(err));
    }
    setSwitching(null);
  };

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Année supprimée.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setDeleting(null);
  };

  const empty = (
    <EmptyState
      icon={CalendarDays}
      title="Aucune année scolaire pour l’instant"
      action={<Button onClick={openNew}>Nouvelle année</Button>}
    >
      Crée une année scolaire avant de créer des classes et d’inscrire des élèves.
    </EmptyState>
  );

  return (
    <>
      <PageHeader
        title="Années scolaires"
        description="Pour passer à l’année suivante : crée-la, puis définis-la comme année en cours."
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle année
          </Button>
        }
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

      <SchoolYearFormModal
        open={form.open}
        record={form.record}
        onClose={() => setForm({ open: false, record: null })}
      />

      <ConfirmDialog
        open={Boolean(switching)}
        title="Changer l’année en cours ?"
        confirmLabel="Confirmer"
        onConfirm={confirmSwitch}
        onCancel={() => setSwitching(null)}
      >
        <p>
          L’année {switching?.label} deviendra l’année en cours : les nouveaux élèves et les bulletins l’utiliseront
          par défaut.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Supprimer cette année ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>L’année {deleting?.label} sera retirée de la liste.</p>
      </ConfirmDialog>
    </>
  );
}