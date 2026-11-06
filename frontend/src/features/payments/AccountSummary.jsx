import Badge from '../../components/ui/Badge.jsx';
import { feeTypeLabel, formatAmount } from '../fees/format.js';
import { formatDate } from '../students/format.js';
import { installmentStatus } from './format.js';

function Stat({ label, value, tone = 'bg-ink/5' }) {
  return (
    <div className={`rounded-xl p-3 ${tone}`}>
      <dt className="text-sm text-ink/70">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

// account: { due, paid, balance, overdueAmount, items } as sent by GET /payments/account/:studentId
export default function AccountSummary({ account }) {
  const owes = Number(account.balance) > 0;
  const late = Number(account.overdueAmount) > 0;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total dû" value={formatAmount(account.due)} />
        <Stat label="Déjà payé" value={formatAmount(account.paid)} />
        <Stat label="Solde restant" value={formatAmount(account.balance)} tone={owes ? 'bg-sun/40' : 'bg-meadow/25'} />
        <Stat label="Dont en retard" value={formatAmount(account.overdueAmount)} tone={late ? 'bg-coral/25' : 'bg-ink/5'} />
      </dl>

      {account.items.length ? (
        <ul className="space-y-2">
          {account.items.map((item) => {
            const [tone, label] = installmentStatus[item.status];
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink/5 p-3">
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-ink/70">
                    {feeTypeLabel[item.type]} · échéance {formatDate(item.dueDate)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">
                    {formatAmount(item.paid)} / {formatAmount(item.amount)}
                  </span>
                  <Badge tone={tone}>{label}</Badge>
                  {item.overdue && <Badge tone="danger">En retard</Badge>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>Aucun frais n’est défini pour ce niveau cette année.</p>
      )}
    </div>
  );
}