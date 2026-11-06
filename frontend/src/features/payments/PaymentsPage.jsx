import { useState } from 'react';
import { Ban, CreditCard, Download, Pencil, Plus } from 'lucide-react';
import { usePagedList } from '../../api/queries.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../auth/useAuth.js';
import { useSchoolYears } from '../classes/hooks.js';
import { formatAmount } from '../fees/format.js';
import { formatDate } from '../students/format.js';
import CancelPaymentModal from './CancelPaymentModal.jsx';
import EditPaymentModal from './EditPaymentModal.jsx';
import { messageFor } from './errors.js';
import { methodLabel, methodOptions, studentName } from './format.js';
import { downloadReceipt } from './hooks.js';
import NewPaymentModal from './NewPaymentModal.jsx';

const iconButton = 'grid size-11 place-items-center rounded-xl hover:bg-ink/5';

// ADMIN and ACCOUNTANT: payment history, new payment, edit, receipt. Only the ADMIN cancels.
export default function PaymentsPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const toast = useToast();

  const years = useSchoolYears();
  const yearList = years.data ?? [];
  const defaultYear = yearList.find((y) => y.isCurrent) ?? yearList[0];

  const [filters, setFilters] = useState({ year: null, method: '', from: '', to: '', includeCancelled: false });
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const yearValue = filters.year ?? (defaultYear ? String(defaultYear.id) : '');
  const list = usePagedList('payments', {
    page,
    limit: 20,
    schoolYearId: yearValue === 'all' ? '' : yearValue,
    method: filters.method,
    from: filters.from,
    to: filters.to,
    includeCancelled: filters.includeCancelled ? 'true' : '',
  });

  const receipt = async (payment) => {
    try {
      await downloadReceipt(payment);
    } catch (err) {
      toast.error(messageFor(err));
    }
  };

  const columns = [
    { key: 'receiptNumber', header: 'Reçu', primary: true, render: (r) => <strong>{r.receiptNumber}</strong> },
    {
      key: 'student',
      header: 'Élève',
      render: (r) => (
        <>
          <span className="font-bold">{studentName(r.student)}</span>
          <span className="block text-sm text-ink/70">Matricule {r.student.matricule}</span>
        </>
      ),
    },
    {
      key: 'amount',
      header: 'Montant',
      render: (r) => <span className={r.cancelledAt ? 'line-through' : 'font-bold'}>{formatAmount(r.amount)}</span>,
    },
    {
      key: 'method',
      header: 'Mode',
      render: (r) => (
        <>
          {methodLabel[r.method]}
          {r.reference && <span className="block text-sm text-ink/70">Réf. {r.reference}</span>}
        </>
      ),
    },
    { key: 'paidAt', header: 'Date', render: (r) => formatDate(r.paidAt) },
    {
      key: 'status',
      header: 'Statut',
      render: (r) =>
        r.cancelledAt ? (
          <>
            <Badge tone="danger">Annulé</Badge>
            {r.cancelReason && <span className="block text-sm text-ink/70">{r.cancelReason}</span>}
          </>
        ) : (
          <Badge tone="success">Valide</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => receipt(r)} aria-label={`Télécharger le reçu ${r.receiptNumber}`} className={iconButton}>
            <Download className="size-5" aria-hidden="true" />
          </button>
          {!r.cancelledAt && (
            <button type="button" onClick={() => setEditing(r)} aria-label={`Modifier le paiement ${r.receiptNumber}`} className={iconButton}>
              <Pencil className="size-5" aria-hidden="true" />
            </button>
          )}
          {isAdmin && !r.cancelledAt && (
            <button type="button" onClick={() => setCancelling(r)} aria-label={`Annuler le paiement ${r.receiptNumber}`} className={iconButton}>
              <Ban className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const empty = (
    <EmptyState
      icon={CreditCard}
      title="Aucun paiement"
      action={<Button onClick={() => setNewOpen(true)}>Nouveau paiement</Button>}
    >
      Aucun paiement ne correspond à ces filtres.
    </EmptyState>
  );

  return (
    <>
      <PageHeader
        title="Paiements"
        description="L’historique des encaissements, avec les reçus PDF."
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nouveau paiement
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <SelectField
          label="Année scolaire"
          value={yearValue}
          disabled={years.isPending}
          onChange={(e) => setFilter('year', e.target.value)}
          className="w-full sm:w-56"
        >
          <option value="all">Toutes les années</option>
          {yearList.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
              {y.isCurrent ? ' (en cours)' : ''}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Mode de paiement"
          value={filters.method}
          onChange={(e) => setFilter('method', e.target.value)}
          className="w-full sm:w-52"
        >
          <option value="">Tous les modes</option>
          {methodOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </SelectField>

        <TextField label="Du" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className="w-full sm:w-44" />
        <TextField label="Au" type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className="w-full sm:w-44" />

        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5"
            checked={filters.includeCancelled}
            onChange={(e) => setFilter('includeCancelled', e.target.checked)}
          />
          <span className="font-bold">Afficher les paiements annulés</span>
        </label>
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

      <NewPaymentModal open={newOpen} onClose={() => setNewOpen(false)} />
      <EditPaymentModal open={Boolean(editing)} payment={editing} onClose={() => setEditing(null)} />
      {isAdmin && <CancelPaymentModal open={Boolean(cancelling)} payment={cancelling} onClose={() => setCancelling(null)} />}
    </>
  );
}