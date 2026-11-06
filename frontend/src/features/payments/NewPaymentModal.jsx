import { useState } from 'react';
import { Download } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useDebounced } from '../../hooks/useDebounced.js';
import { useToast } from '../../hooks/useToast.js';
import { formatAmount } from '../fees/format.js';
import AccountSummary from './AccountSummary.jsx';
import { messageFor } from './errors.js';
import { methodOptions, studentName, todayInput } from './format.js';
import { downloadReceipt, usePaymentMutations, useStudentAccount, useStudentSearch } from './hooks.js';

function NewPaymentForm({ initialStudent, onClose }) {
  const toast = useToast();
  const { create } = usePaymentMutations();

  const [student, setStudent] = useState(initialStudent);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput.trim());
  const results = useStudentSearch(student ? '' : search);
  const account = useStudentAccount(student?.id);

  const [values, setValues] = useState({ amount: '', method: 'CASH', reference: '', note: '', paidAt: todayInput() });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const change = (key) => (event) => {
    setValues((v) => ({ ...v, [key]: event.target.value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setServerError(null);
  };

  const balance = account.data ? Number(account.data.balance) : null;
  const nothingToPay = balance !== null && balance <= 0;

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);
    if (!student) {
      setServerError('Choisis d’abord un élève.');
      return;
    }

    const next = {};
    const amount = Number(values.amount);
    if (values.amount.trim() === '' || Number.isNaN(amount) || amount <= 0) {
      next.amount = 'Saisis un montant supérieur à 0.';
    } else if (Math.abs(amount * 1000 - Math.round(amount * 1000)) > 1e-6) {
      next.amount = '3 décimales au maximum.';
    } else if (balance !== null && amount > balance + 1e-9) {
      next.amount = `Le montant dépasse le solde restant (${formatAmount(account.data.balance)}).`;
    }
    if (values.method !== 'CASH' && !values.reference.trim()) {
      next.reference = 'Saisis la référence du virement ou du paiement mobile.';
    }
    if (!values.paidAt) next.paidAt = 'Choisis la date du paiement.';
    else if (values.paidAt > todayInput()) next.paidAt = 'La date ne peut pas être dans le futur.';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      const result = await create.mutateAsync({
        studentId: student.id,
        amount,
        method: values.method,
        reference: values.reference.trim() || undefined,
        note: values.note.trim() || undefined,
        paidAt: values.paidAt,
      });
      setDone(result);
    } catch (err) {
      setServerError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadReceipt(done.data);
    } catch (err) {
      toast.error(messageFor(err));
    } finally {
      setDownloading(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title="Paiement enregistré">
          <p>
            Reçu n° {done.data.receiptNumber} · {formatAmount(done.data.amount)}
          </p>
          <p>Solde restant : {formatAmount(done.balance)}</p>
          {done.notified?.inApp > 0 && (
            <p>
              {done.notified.inApp} parent{done.notified.inApp > 1 ? 's' : ''} notifié{done.notified.inApp > 1 ? 's' : ''}.
            </p>
          )}
        </Alert>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" loading={downloading} onClick={download}>
            <Download className="size-4" aria-hidden="true" />
            Télécharger le reçu
          </Button>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>
    );
  }

  const found = results.data ?? [];

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      {student ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky/10 p-3">
          <div>
            <p className="font-bold">{studentName(student)}</p>
            <p className="text-sm text-ink/70">Matricule {student.matricule}</p>
          </div>
          <Button variant="ghost" onClick={() => setStudent(null)}>
            Changer d’élève
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <TextField
            label="Élève"
            hint="Saisis au moins 2 lettres du nom ou du matricule."
            autoComplete="off"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {search.length >= 2 && results.isPending && <p className="text-sm text-ink/70">Recherche…</p>}
          {results.error && <Alert tone="danger">{results.error.message}</Alert>}
          {search.length >= 2 && !results.isPending && !results.error && found.length === 0 && (
            <p>Aucun élève trouvé.</p>
          )}
          {found.length > 0 && (
            <ul className="space-y-1">
              {found.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStudent(s)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border-2 border-ink/10 px-4 py-2 text-start hover:border-sky"
                  >
                    <span className="font-bold">{studentName(s)}</span>
                    <span className="text-sm text-ink/70">Matricule {s.matricule}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {student && account.isPending && (
        <div role="status" aria-label="Chargement du compte" className="h-32 animate-pulse rounded-2xl bg-ink/10" />
      )}
      {student && account.error && <Alert tone="danger">{messageFor(account.error)}</Alert>}
      {student && account.data && <AccountSummary account={account.data} />}
      {nothingToPay && <Alert tone="info">Cet élève n’a plus rien à payer pour l’année en cours.</Alert>}

      {student && account.data && !nothingToPay && (
        <>
          <div className="space-y-2">
            <TextField
              label="Montant (TND)"
              type="number"
              inputMode="decimal"
              step="any"
              hint="Jusqu’à 3 décimales, par exemple 150.500."
              value={values.amount}
              onChange={change('amount')}
              error={errors.amount}
            />
            <Button
              variant="ghost"
              onClick={() => {
                setValues((v) => ({ ...v, amount: account.data.balance }));
                setErrors((e) => ({ ...e, amount: undefined }));
              }}
            >
              Régler tout le solde ({formatAmount(account.data.balance)})
            </Button>
          </div>

          <SelectField label="Mode de paiement" value={values.method} onChange={change('method')}>
            {methodOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </SelectField>

          <TextField
            label={values.method === 'CASH' ? 'Référence (facultatif)' : 'Référence'}
            hint="Numéro du virement ou de la transaction mobile. Obligatoire hors espèces."
            autoComplete="off"
            value={values.reference}
            onChange={change('reference')}
            error={errors.reference}
          />

          <TextField
            label="Date du paiement"
            type="date"
            max={todayInput()}
            value={values.paidAt}
            onChange={change('paidAt')}
            error={errors.paidAt}
          />

          <TextField label="Note (facultatif)" autoComplete="off" value={values.note} onChange={change('note')} />
        </>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={saving} disabled={!student || !account.data || nothingToPay}>
          Enregistrer le paiement
        </Button>
      </div>
    </form>
  );
}

// Mounted only while open: the form always starts empty. initialStudent: student already chosen (from the unpaid list)
export default function NewPaymentModal({ open, initialStudent = null, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Nouveau paiement" size="lg">
      <NewPaymentForm initialStudent={initialStudent} onClose={onClose} />
    </Modal>
  );
}