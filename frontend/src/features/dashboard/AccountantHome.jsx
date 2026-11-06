import { Link } from 'react-router-dom';
import { CreditCard, Wallet, Users, CircleAlert, Plus } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../auth/useAuth.js';
import { useCount } from './useCount.js';

function StatCard({ to, icon: Icon, label, query, tone = 'bg-sky/15' }) {
  const value = query.isPending ? '…' : query.error ? '—' : query.data;

  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl bg-paper p-5 transition-shadow hover:shadow-md focus-visible:shadow-md"
    >
      <span className={`grid size-14 shrink-0 place-items-center rounded-full ${tone}`}>
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-4xl font-semibold" aria-live="polite">
          {value}
        </span>
        <span className="block font-bold">{label}</span>
      </span>
    </Link>
  );
}

export default function AccountantHome() {
  const { user } = useAuth();
  
  // On récupère les compteurs via l'API
  const payments = useCount('payments');
  const fees = useCount('fee-items');
  const students = useCount('students');
  
  // Hypothèse : s'il y a une route dédiée aux impayés, on pourrait l'utiliser. 
  // Sinon on affiche un raccourci statique.
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold">Bonjour {user.firstName} !</h1>
        <p className="mt-1 text-lg">Voici un aperçu de la situation financière de l’école.</p>
      </header>

      <section aria-label="Chiffres clés" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard to="/comptabilite/paiements" icon={CreditCard} label="Paiements enregistrés" query={payments} />
        <StatCard to="/comptabilite/frais" icon={Wallet} label="Frais configurés" query={fees} />
        <StatCard to="/comptabilite/paiements" icon={Users} label="Élèves inscrits" query={students} />
      </section>

      <section aria-label="Actions rapides">
        <h2 className="mb-3 text-xl font-semibold">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/comptabilite/paiements">
            <Button>
              <Plus className="size-4" aria-hidden="true" />
              Enregistrer un paiement
            </Button>
          </Link>
          <Link to="/comptabilite/impayes">
            <Button variant="secondary">
              <CircleAlert className="size-4" aria-hidden="true" />
              Voir les impayés
            </Button>
          </Link>
          <Link to="/comptabilite/frais">
            <Button variant="secondary">
              <Wallet className="size-4" aria-hidden="true" />
              Gérer les frais scolaires
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}