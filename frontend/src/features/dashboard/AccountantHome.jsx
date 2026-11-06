import { Link } from 'react-router-dom';
import { CircleAlert, CreditCard, Wallet } from 'lucide-react';
import { usePagedList } from '../../api/queries.js';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { useAuth } from '../auth/useAuth.js';
import { useSchoolYears } from '../classes/hooks.js';
import { formatAmount } from '../fees/format.js';
import { useOverdue } from '../payments/hooks.js';
import { methodLabel, studentName } from '../payments/format.js';
import { formatDate } from '../students/format.js';

function Stat({ label, value, tone = 'bg-paper' }) {
  return (
    <div className={`rounded-2xl p-5 ${tone}`}>
      <dt className="text-ink/70">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}

const shortcuts = [
  { to: '/comptabilite/paiements', label: 'Paiements', text: 'Encaisser et consulter l’historique', icon: CreditCard },
  { to: '/comptabilite/impayes', label: 'Impayés', text: 'Suivre les soldes et envoyer les relances', icon: CircleAlert },
  { to: '/comptabilite/frais', label: 'Frais scolaires', text: 'Consulter les frais de l’année', icon: Wallet },
];

export default function AccountantHome() {
  const { user } = useAuth();
  const years = useSchoolYears();
  const yearList = years.data ?? [];
  const currentYear = yearList.find((y) => y.isCurrent);
  const yearId = currentYear ? String(currentYear.id) : '';

  const balances = useOverdue({ schoolYearId: yearId, all: true });
  const recent = usePagedList('payments', { page: 1, limit: 5, schoolYearId: yearId });

  const totals = balances.data?.totals;
  const lateStudents = (balances.data?.data ?? []).filter((r) => Number(r.overdueAmount) > 0).length;
  const payments = recent.data?.data ?? [];

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.firstName} !`}
        description={currentYear ? `Situation des paiements, année scolaire ${currentYear.label}.` : 'Situation des paiements.'}
      />

      {!years.isPending && !currentYear && (
        <Alert tone="info">Aucune année scolaire n’est en cours : demande à l’administrateur d’en définir une.</Alert>
      )}
      {balances.error && <Alert tone="danger">{balances.error.message}</Alert>}

      {totals && (
        <dl className="mb-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Solde restant à encaisser" value={formatAmount(totals.balance)} tone="bg-sun/40" />
          <Stat label="Dont en retard" value={formatAmount(totals.overdue)} tone={Number(totals.overdue) > 0 ? 'bg-coral/25' : 'bg-paper'} />
          <Stat label="Élèves en retard" value={`${lateStudents} sur ${totals.students}`} />
        </dl>
      )}

      <ul className="mb-8 grid gap-4 sm:grid-cols-3">
        {shortcuts.map(({ to, label, text, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex h-full items-start gap-3 rounded-2xl bg-paper p-5 hover:bg-ink/5">
              <Icon className="mt-1 size-6 shrink-0" aria-hidden="true" />
              <span>
                <span className="block text-lg font-bold">{label}</span>
                <span className="block text-ink/70">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Derniers paiements</h2>
        {recent.isPending && yearId ? (
          <div role="status" aria-label="Chargement" className="h-32 animate-pulse rounded-2xl bg-ink/10" />
        ) : payments.length === 0 ? (
          <p className="rounded-2xl bg-paper p-4">Aucun paiement enregistré pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper p-3">
                <div>
                  <p className="font-bold">
                    {p.receiptNumber} · {studentName(p.student)}
                  </p>
                  <p className="text-sm text-ink/70">
                    {formatDate(p.paidAt)} · {methodLabel[p.method]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={p.cancelledAt ? 'line-through' : 'font-bold'}>{formatAmount(p.amount)}</span>
                  {p.cancelledAt && <Badge tone="danger">Annulé</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}