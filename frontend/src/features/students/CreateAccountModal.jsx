import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useStudentMutations } from './hooks.js';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Saisis l’adresse e-mail.')
    .email('Cette adresse e-mail n’est pas valide.'),
});

const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (err.status === 409) return 'Cette adresse e-mail est déjà utilisée, ou cet élève a déjà un compte.';
  if (err.status === 400) return 'Cette adresse e-mail est refusée par le serveur.';
  return 'Impossible de créer le compte pour le moment. Réessaie dans un instant.';
};

export default function CreateAccountModal({ student, open, onClose }) {
  const { createAccount } = useStudentMutations();
  const [result, setResult] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const close = () => {
    reset();
    setResult(null);
    setServerError(null);
    setCopied(false);
    onClose();
  };

  const onSubmit = async ({ email }) => {
    setServerError(null);
    try {
      setResult(await createAccount.mutateAsync({ id: student.id, email }));
    } catch (err) {
      setServerError(messageFor(err));
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
    } catch {
      // The password stays visible on screen: it can be selected by hand
    }
  };

  return (
    <Modal open={open} onClose={close} title="Compte de connexion" size="sm">
      {result ? (
        <div className="space-y-4">
          <Alert tone="success" title="Compte créé">
            <p>Adresse : {result.data?.email}</p>
          </Alert>

          <div>
            <p className="mb-1.5 font-bold">Mot de passe temporaire</p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="select-all rounded-lg bg-ink/10 px-3 py-2 font-bold">{result.tempPassword}</code>
              <Button variant="secondary" onClick={copy}>
                {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                {copied ? 'Copié' : 'Copier'}
              </Button>
            </div>
            <p className="mt-3">
              Note-le maintenant : il ne sera plus affiché. L’élève devra le changer à sa première connexion.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={close}>Terminer</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <p>
            Un compte permet à {student.firstName} de consulter ses informations et d’écrire à l’administration. Un
            mot de passe temporaire sera créé.
          </p>
          {serverError && <Alert tone="danger">{serverError}</Alert>}
          <TextField
            label="Adresse e-mail"
            type="email"
            inputMode="email"
            autoComplete="off"
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={close}>
              Annuler
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Créer le compte
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}