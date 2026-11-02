import { CircleCheck, Clock, CircleAlert, Inbox } from 'lucide-react';
import Button from './components/ui/Button.jsx';
import TextField from './components/ui/TextField.jsx';
import Badge from './components/ui/Badge.jsx';
import Alert from './components/ui/Alert.jsx';
import EmptyState from './components/ui/EmptyState.jsx';

export default function App() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-4xl font-semibold">NextEducation</h1>

      <section className="flex flex-wrap gap-3">
        <Button>Enregistrer le paiement</Button>
        <Button variant="secondary">Annuler</Button>
        <Button variant="danger">Supprimer</Button>
        <Button variant="ghost">Voir le détail</Button>
        <Button loading>Envoi en cours</Button>
      </section>

      <section className="flex flex-wrap gap-3">
        <Badge tone="success" icon={CircleCheck}>Payé</Badge>
        <Badge tone="warning" icon={Clock}>En attente</Badge>
        <Badge tone="danger" icon={CircleAlert}>Absent</Badge>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <TextField label="Adresse e-mail" type="email" hint="Celle que l’école t’a donnée" />
        <TextField
          label="Mot de passe"
          type="password"
          error="Le mot de passe doit contenir au moins 8 caractères."
        />
      </section>

      <section className="space-y-3">
        <Alert tone="success" title="Paiement enregistré">Le reçu est prêt à être téléchargé.</Alert>
        <Alert tone="danger" title="Cet horaire est déjà pris">M. Karray enseigne déjà à cette heure (08:00-09:00).</Alert>
      </section>

      <EmptyState
        icon={Inbox}
        title="Aucun message pour l’instant"
        action={<Button>Écrire un message</Button>}
      >
        Les messages de l’école et des enseignants apparaîtront ici.
      </EmptyState>
    </main>
  );
}