import { Copy } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../hooks/useToast.js';

// credentials: { user?: {...}, email?, temporaryPassword? } — many backends return a different shape,
// so we handle each variant to be safe.
export default function CredentialsModal({ credentials, onClose }) {
  const toast = useToast();
  if (!credentials) return null;

  const email = credentials.email ?? credentials.user?.email ?? '';
  const password =
    credentials.temporaryPassword ?? credentials.password ?? credentials.tempPassword ?? '';

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copié.');
    } catch {
      toast.error('Impossible de copier. Sélectionne le texte manuellement.');
    }
  };

  return (
    <Modal open onClose={onClose} title="Identifiants créés" size="sm">
      <p className="mb-4">
        Transmets ces identifiants à la personne. Le mot de passe ne sera plus affiché ensuite.
      </p>

      <div className="space-y-3 rounded-xl bg-sun/30 p-4">
        <div>
          <p className="text-sm font-bold text-ink/70">Adresse e-mail</p>
          <div className="flex items-center justify-between gap-2">
            <p className="break-all font-mono">{email}</p>
            <Button variant="ghost" onClick={() => copy(email)} aria-label="Copier l’adresse e-mail">
              <Copy className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {password && (
          <div>
            <p className="text-sm font-bold text-ink/70">Mot de passe temporaire</p>
            <div className="flex items-center justify-between gap-2">
              <p className="break-all font-mono text-lg">{password}</p>
              <Button variant="ghost" onClick={() => copy(password)} aria-label="Copier le mot de passe">
                <Copy className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm text-ink/70">
        La personne devra changer ce mot de passe à sa première connexion.
      </p>

      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>J’ai noté</Button>
      </div>
    </Modal>
  );
}