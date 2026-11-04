import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextAreaField from '../../components/ui/TextAreaField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from './errors.js';
import { classLabel } from './format.js';
import { useClassOptions, useStudent, useStudentMutations } from './hooks.js';

const today = new Date().toISOString().slice(0, 10);

const schema = z.object({
  lastName: z.string().trim().min(1, 'Saisis le nom.').max(60, '60 caractères maximum.'),
  firstName: z.string().trim().min(1, 'Saisis le prénom.').max(60, '60 caractères maximum.'),
  birthDate: z
    .string()
    .min(1, 'Saisis la date de naissance.')
    .refine((value) => new Date(value) < new Date(), 'La date de naissance doit être dans le passé.'),
  gender: z.enum(['MALE', 'FEMALE'], { error: 'Choisis le genre.' }),
  medicalNotes: z.string().trim().max(1000, '1000 caractères maximum.'),
  classId: z.string(),
});

function StudentForm({ student }) {
  const isEdit = Boolean(student);
  const navigate = useNavigate();
  const toast = useToast();
  const { create, update } = useStudentMutations();
  const classes = useClassOptions(!isEdit);
  const [serverError, setServerError] = useState(null);

  const cancelTo = isEdit ? `/admin/eleves/${student.id}` : '/admin/eleves';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      lastName: student?.lastName ?? '',
      firstName: student?.firstName ?? '',
      birthDate: student?.birthDate?.slice(0, 10) ?? '',
      gender: student?.gender ?? '',
      medicalNotes: student?.medicalNotes ?? '',
      classId: '',
    },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    const body = {
      firstName: values.firstName,
      lastName: values.lastName,
      birthDate: values.birthDate,
      gender: values.gender,
    };

    try {
      if (isEdit) {
        body.medicalNotes = values.medicalNotes; // an empty text clears the notes
        await update.mutateAsync({ id: student.id, body });
        toast.success('Les informations de l’élève sont enregistrées.');
        navigate(`/admin/eleves/${student.id}`);
      } else {
        if (values.medicalNotes) body.medicalNotes = values.medicalNotes;
        if (values.classId) body.classId = Number(values.classId);
        const created = await create.mutateAsync(body);
        toast.success('Élève ajouté.');
        navigate(`/admin/eleves/${created.data.id}`);
      }
    } catch (err) {
      setServerError(messageFor(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-5 rounded-2xl bg-paper p-6">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Nom" autoComplete="off" error={errors.lastName?.message} {...register('lastName')} />
        <TextField label="Prénom" autoComplete="off" error={errors.firstName?.message} {...register('firstName')} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Date de naissance"
          type="date"
          max={today}
          error={errors.birthDate?.message}
          {...register('birthDate')}
        />
        <SelectField label="Genre" error={errors.gender?.message} {...register('gender')}>
          <option value="">Choisir…</option>
          <option value="FEMALE">Fille</option>
          <option value="MALE">Garçon</option>
        </SelectField>
      </div>

      {isEdit ? (
        <p className="text-sm text-ink/70">Le changement de classe se fait à part (inscriptions).</p>
      ) : (
        <SelectField label="Classe" hint="Facultatif : tu peux inscrire l’élève plus tard." {...register('classId')}>
          <option value="">Aucune pour l’instant</option>
          {classes.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {classLabel(c)}
            </option>
          ))}
        </SelectField>
      )}

      <TextAreaField
        label="Notes médicales"
        hint="Facultatif : allergies, traitements, informations utiles à l’école."
        error={errors.medicalNotes?.message}
        {...register('medicalNotes')}
      />

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={() => navigate(cancelTo)}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Enregistrer' : 'Ajouter l’élève'}
        </Button>
      </div>
    </form>
  );
}

export default function StudentFormPage() {
  const { id } = useParams();
  const isEdit = id !== undefined;
  const { data: student, error, isPending, refetch } = useStudent(id);

  const back = (
    <Link
      to={isEdit ? `/admin/eleves/${id}` : '/admin/eleves'}
      className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-bold text-sky hover:underline"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
      {isEdit ? 'Retour à la fiche' : 'Retour aux élèves'}
    </Link>
  );

  if (isEdit && isPending) {
    return (
      <>
        {back}
        <div role="status" aria-label="Chargement du formulaire" className="h-64 max-w-2xl animate-pulse rounded-2xl bg-ink/10" />
      </>
    );
  }

  if (isEdit && error) {
    return (
      <>
        {back}
        <Alert tone="danger" title="Impossible de charger l’élève">
          <p>{error.message}</p>
          <Button variant="secondary" onClick={() => refetch()} className="mt-3">
            Réessayer
          </Button>
        </Alert>
      </>
    );
  }

  return (
    <>
      {back}
      <PageHeader
        title={isEdit ? 'Modifier l’élève' : 'Nouvel élève'}
        description={isEdit ? `${student.lastName} ${student.firstName}` : 'Le matricule est créé automatiquement.'}
      />
      <StudentForm student={student} />
    </>
  );
}