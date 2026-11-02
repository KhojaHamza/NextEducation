import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { homeFor } from '../../app/roleHome.js';
import { useAuth } from './useAuth.js';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Saisis ton adresse e-mail.')
    .email('Cette adresse e-mail n’est pas valide.'),
  password: z.string().min(1, 'Saisis ton mot de passe.'),
});

// Turns an API error into a sentence that tells the person what to do
const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (err.status === 401) return 'Adresse e-mail ou mot de passe incorrect.';
  if (err.status === 403) return 'Ce compte est désactivé. Contacte l’administration de l’école.';
  return 'Connexion impossible pour le moment. Réessaie dans un instant.';
};

const features = [
  { label: 'Notes et bulletins', dot: 'bg-sun' },
  { label: 'Absences', dot: 'bg-coral' },
  { label: 'Emploi du temps', dot: 'bg-meadow' },
  { label: 'Paiements', dot: 'bg-sky' },
  { label: 'Messages', dot: 'bg-grape' },
];

export default function LoginPage() {
  const { user, status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
      const loggedIn = await login(email, password);
      navigate(location.state?.from ?? homeFor(loggedIn.role), { replace: true });
    } catch (err) {
      setServerError(messageFor(err));
    }
  };

  // Someone who is already logged in has nothing to do here
  if (status === 'authenticated') return <Navigate to={homeFor(user.role)} replace />;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden bg-sky p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="font-display text-2xl font-semibold">NextEducation</p>
        <div>
          <p className="font-display text-5xl font-semibold leading-tight">
            Toute l’école au même endroit.
          </p>
          <ul className="mt-8 flex flex-wrap gap-3 text-ink">
            {features.map((f) => (
              <li key={f.label} className="flex items-center gap-2 rounded-full bg-paper px-4 py-2 font-bold">
                <span className={`size-3 rounded-full ${f.dot}`} aria-hidden="true" />
                {f.label}
              </li>
            ))}
          </ul>
        </div>
        <span aria-hidden="true" />
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <p className="font-display text-2xl font-semibold text-sky lg:hidden">NextEducation</p>
          <h1 className="mt-6 text-4xl font-semibold lg:mt-0">Bienvenue</h1>
          <p className="mt-2 text-lg">Connecte-toi avec l’adresse e-mail donnée par l’école.</p>

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

          <p className="mt-6 text-sm text-ink/70">
            Mot de passe oublié ? Contacte l’administration de l’école.
          </p>
        </div>
      </main>
    </div>
  );
}