import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';

// Shown once, right after an account is created: the backend never returns the temporary password again
export default function CredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState(false);

  const close = () => {
    setCopied(false);
    onClose();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(credentials.tempPassword);
      setCopied(true);
    } catch {
      // The password stays visible on screen: it can be selected by hand
    }
  };

  return (
    <Modal open={Boolean(credentials)} onClose={close} title="Compte créé" size="sm">
      {credentials && (
        <div className="space-y-4">
          <Alert tone="success">
            <p>Adresse : {credentials.email}</p>
          </Alert>

          <div>
            <p className="mb-1.5 font-bold">Mot de passe temporaire</p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="select-all rounded-lg bg-ink/10 px-3 py-2 font-bold">{credentials.tempPassword}</code>
              <Button variant="secondary" onClick={copy}>
                {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                {copied ? 'Copié' : 'Copier'}
              </Button>
            </div>
            <p className="mt-3">
              Note-le maintenant : il ne sera plus affiché. La personne devra le changer à sa première connexion.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={close}>Terminer</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}