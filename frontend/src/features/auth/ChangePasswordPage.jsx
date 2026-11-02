import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { homeFor } from '../../app/roleHome.js';
import { changePassword } from './authApi.js';
import { useAuth } from './useAuth.js';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Saisis ton mot de passe actuel.'),
    newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.'),
    confirmPassword: z.string().min(1, 'Confirme ton nouveau mot de passe.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les deux mots de passe ne sont pas identiques.',
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ['newPassword'],
    message: 'Choisis un mot de passe différent de l’actuel.',
  });

const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (err.status === 401) return 'Le mot de passe actuel est incorrect.';
  // The backend explains its own rules (length, complexity...): show that explanation
  if ([400, 409, 422].includes(err.status)) return err.message;
  return 'Le changement a échoué. Réessaie dans un instant.';
};

export default function ChangePasswordPage() {
  const { user, logout, markPasswordChanged } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const inputType = showPasswords ? 'text' : 'password';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setServerError(null);
    try {
      await changePassword({ currentPassword, newPassword });
      markPasswordChanged();
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      setServerError(messageFor(err));
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
      <p className="font-display text-2xl font-semibold text-sky">NextEducation</p>
      <h1 className="mt-6 text-4xl font-semibold">Choisis ton mot de passe</h1>

      {user.mustChangePassword ? (
        <div className="mt-4">
          <Alert tone="info">
            Ton mot de passe est temporaire. Choisis-en un nouveau pour continuer.
          </Alert>
        </div>
      ) : (
        <p className="mt-2 text-lg">Saisis ton mot de passe actuel, puis le nouveau.</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        {serverError && <Alert tone="danger">{serverError}</Alert>}

        <TextField
          label="Mot de passe actuel"
          type={inputType}
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <TextField
          label="Nouveau mot de passe"
          type={inputType}
          autoComplete="new-password"
          hint="Au moins 8 caractères."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <TextField
          label="Confirme le nouveau mot de passe"
          type={inputType}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            className="size-5 accent-sky"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
          />
          Afficher les mots de passe
        </label>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Enregistrer mon mot de passe
        </Button>
      </form>

      <Button variant="ghost" onClick={logout} className="mt-4 self-start">
        <LogOut className="size-4" aria-hidden="true" />
        Se déconnecter
      </Button>
    </main>
  );
}