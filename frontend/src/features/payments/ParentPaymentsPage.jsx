import { Download, Users } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../hooks/useToast.js';
import { formatAmount } from '../fees/format.js';
import { useMyChildren } from '../reportCards/hooks.js';
import { formatDate } from '../students/format.js';
import AccountSummary from './AccountSummary.jsx';
import { messageFor } from './errors.js';
import { methodLabel } from './format.js';
import { downloadReceipt, useMyPayments, useStudentAccount } from './hooks.js';

function ChildSection({ child, payments }) {
  const toast = useToast();
  const account = useStudentAccount(child.id);
  const mine = payments.filter((p) => p.studentId === child.id);

  const receipt = async (payment) => {
    try {
      await downloadReceipt(payment);
    } catch (err) {
      toast.error(messageFor(err));
    }
  };

  const columns = [
    { key: 'receiptNumber', header: 'Reçu', primary: true, render: (r) => <strong>{r.receiptNumber}</strong> },
    { key: 'paidAt', header: 'Date', render: (r) => formatDate(r.paidAt) },
    {
      key: 'amount',
      header: 'Montant',
      render: (r) => <span className={r.cancelledAt ? 'line-through' : 'font-bold'}>{formatAmount(r.amount)}</span>,
    },
    { key: 'method', header: 'Mode', render: (r) => methodLabel[r.method] },
    {
      key: 'status',
      header: 'Statut',
      render: (r) => (r.cancelledAt ? <Badge tone="danger">Annulé</Badge> : <Badge tone="success">Valide</Badge>),
    },
    {
      key: 'actions',
      header: 'Reçu PDF',
      render: (r) =>
        r.cancelledAt ? (
          '—'
        ) : (
          <button
            type="button"
            onClick={() => receipt(r)}
            aria-label={`Télécharger le reçu ${r.receiptNumber}`}
            className="grid size-11 place-items-center rounded-xl hover:bg-ink/5"
          >
            <Download className="size-5" aria-hidden="true" />
          </button>
        ),
    },
  ];

  return (
    <section aria-label={`${child.lastName} ${child.firstName}`} className="space-y-4">
      <h2 className="text-2xl font-semibold">
        {child.lastName} {child.firstName}
        {account.data && <span className="text-lg font-bold text-ink/70"> · {account.data.class}</span>}
      </h2>

      {account.isPending ? (
        <div role="status" aria-label="Chargement de la situation" className="h-32 animate-pulse rounded-2xl bg-ink/10" />
      ) : account.error ? (
        account.error.status === 404 ? (
          <Alert tone="info">Cet enfant n’est inscrit dans aucune classe cette année : aucun frais à afficher.</Alert>
        ) : (
          <Alert tone="danger" title="Impossible de charger la situation">
            <p>{messageFor(account.error)}</p>
            <Button variant="secondary" onClick={() => account.refetch()} className="mt-3">
              Réessayer
            </Button>
          </Alert>
        )
      ) : (
        <AccountSummary account={account.data} />
      )}

      <h3 className="text-xl font-semibold">Paiements enregistrés</h3>
      <DataTable
        columns={columns}
        rows={mine}
        empty={<p className="rounded-2xl bg-paper p-4">Aucun paiement enregistré pour cet enfant.</p>}
      />
    </section>
  );
}

export default function ParentPaymentsPage() {
  const children = useMyChildren();
  const payments = useMyPayments();

  let body;
  if (children.isPending || payments.isPending) {
    body = <div role="status" aria-label="Chargement" className="h-48 animate-pulse rounded-2xl bg-ink/10" />;
  } else if (children.error || payments.error) {
    const error = children.error ?? payments.error;
    body = (
      <Alert tone="danger" title="Impossible de charger les paiements">
        <p>{messageFor(error)}</p>
        <Button
          variant="secondary"
          onClick={() => {
            children.refetch();
            payments.refetch();
          }}
          className="mt-3"
        >
          Réessayer
        </Button>
      </Alert>
    );
  } else if (children.data.length === 0) {
    body = (
      <EmptyState icon={Users} title="Aucun enfant lié à ton compte">
        Contacte l’administration de l’école pour qu’elle lie tes enfants à ton compte.
      </EmptyState>
    );
  } else {
    body = (
      <div className="space-y-10">
        {children.data.map((child) => (
          <ChildSection key={child.id} child={child} payments={payments.data} />
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Paiements"
        description="La situation financière de tes enfants. Les paiements sont enregistrés par le secrétariat de l’école."
      />
      {body}
    </>
  );
}