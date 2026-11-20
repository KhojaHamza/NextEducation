import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { useAuth } from '../auth/useAuth.js';

const schema = z.object({
  email: z.string().trim().min(1, 'Saisis ton adresse e-mail.'),
  password: z.string().min(1, 'Saisis ton mot de passe.'),
});

const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (err.status === 401) return 'Adresse e-mail ou mot de passe incorrect.';
  if (err.status === 429) return 'Trop de tentatives. Réessaie dans 15 minutes.';
  return err.message || 'Connexion impossible pour le moment.';
};

export default function PlatformLoginPage() {
  const { user, status, platformLogin } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async ({ email, password }) => {
    setServerError(null);
    try {
      await platformLogin(email, password);
      navigate('/plateforme', { replace: true });
    } catch (err) {
      setServerError(messageFor(err));
    }
  };

  if (status === 'authenticated' && user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/plateforme" replace />;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <p className="font-display text-2xl font-semibold text-sky">NextEducation</p>
        <h1 className="mt-6 text-4xl font-semibold">Espace plateforme</h1>
        <p className="mt-2 text-lg">Réservé à l’équipe qui gère les écoles.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
          {serverError && <Alert tone="danger">{serverError}</Alert>}
          <TextField
            label="Adresse e-mail"
            type="email"
            inputMode="email"
            autoComplete="username"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="size-5 accent-sky"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            Afficher le mot de passe
          </label>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Se connecter
          </Button>
        </form>
      </div>
    </main>
  );
}