import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
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
import { messageFor } from './errors.js';
import { countRoomSlots, useRoomMutations } from './hooks.js';
import RoomFormModal from './RoomFormModal.jsx';

const PAGE_SIZE = 20;

export default function RoomsPage() {
  const toast = useToast();
  const { remove } = useRoomMutations();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null);

  const list = usePagedList('rooms', { page, limit: PAGE_SIZE });

  const openNew = () => setForm({ open: true, record: null });

  // A room used by the timetable is not deleted: its courses would keep pointing at it
  const askDelete = async (room) => {
    try {
      const count = await countRoomSlots(room.id);
      if (count > 0) {
        toast.error(
          `La salle ${room.name} est utilisée par ${count} créneau${count > 1 ? 'x' : ''} de l’emploi du temps. Change la salle de ces créneaux d’abord, ou marque-la comme indisponible.`,
        );
        return;
      }
      setDeleting(room);
    } catch (err) {
      toast.error(messageFor(err));
    }
  };

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Salle supprimée.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setDeleting(null);
  };

  const columns = [
    { key: 'name', header: 'Salle', primary: true, render: (r) => <strong>{r.name}</strong> },
    { key: 'capacity', header: 'Capacité', render: (r) => `${r.capacity} places` },
    {
      key: 'status',
      header: 'Statut',
      render: (r) => (r.isAvailable ? <Badge tone="success">Disponible</Badge> : <Badge tone="warning">Indisponible</Badge>),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <RowActions
          label={`la salle ${r.name}`}
          onEdit={() => setForm({ open: true, record: r })}
          onDelete={() => askDelete(r)}
        />
      ),
    },
  ];

  const empty = (
    <EmptyState icon={Building2} title="Aucune salle pour l’instant" action={<Button onClick={openNew}>Nouvelle salle</Button>}>
      Crée les salles de l’école pour pouvoir les choisir dans l’emploi du temps.
    </EmptyState>
  );

  return (
    <>
      <PageHeader
        title="Salles"
        description="Les salles que l’on peut choisir dans l’emploi du temps."
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle salle
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

      <RoomFormModal open={form.open} record={form.record} onClose={() => setForm({ open: false, record: null })} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Supprimer cette salle ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>La salle {deleting?.name} sera retirée de la liste.</p>
      </ConfirmDialog>
    </>
  );
}