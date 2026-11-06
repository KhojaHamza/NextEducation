import { useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { classLabel } from './format.js';
import { linkMessageFor } from './linkErrors.js';
import { useClassesOfYear, useStudentLinks } from './linkHooks.js';

// enrollment = null -> enroll in a new year; enrollment = {...} -> change class within the same year
function EnrollmentForm({ student, enrollment, years, onClose }) {
  const toast = useToast();
  const { enroll, transfer } = useStudentLinks();
  const isTransfer = Boolean(enrollment);

  const enrolledYears = new Set((student.enrollments ?? []).map((e) => e.schoolYearId));
  const availableYears = isTransfer
    ? years.filter((y) => y.id === enrollment.schoolYearId)
    : years.filter((y) => !enrolledYears.has(y.id));
  const initialYear = availableYears.find((y) => y.isCurrent) ?? availableYears[0];

  const [yearId, setYearId] = useState(initialYear ? String(initialYear.id) : '');
  const [classId, setClassId] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const classes = useClassesOfYear(yearId);
  const options = (classes.data ?? []).filter((c) => c.id !== enrollment?.classId);

  if (!availableYears.length) {
    return (
      <div className="space-y-5">
        <Alert tone="info">Cet élève est déjà inscrit pour toutes les années scolaires existantes.</Alert>
        <div className="flex justify-end">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);
    if (!classId) {
      setFieldError('Choisis une classe.');
      return;
    }
    setSaving(true);
    try {
      if (isTransfer) {
        await transfer.mutateAsync({ id: enrollment.id, classId: Number(classId) });
        toast.success('Classe modifiée.');
      } else {
        await enroll.mutateAsync({ studentId: student.id, classId: Number(classId) });
        toast.success('Élève inscrit.');
      }
      onClose();
    } catch (err) {
      setServerError(linkMessageFor(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <SelectField
        label="Année scolaire"
        value={yearId}
        disabled={isTransfer || availableYears.length === 1}
        onChange={(e) => {
          setYearId(e.target.value);
          setClassId('');
          setFieldError(null);
        }}
      >
        {availableYears.map((y) => (
          <option key={y.id} value={y.id}>
            {y.label}
            {y.isCurrent ? ' (en cours)' : ''}
          </option>
        ))}
      </SelectField>

      {classes.error ? (
        <Alert tone="danger">{classes.error.message}</Alert>
      ) : (
        <SelectField
          label={isTransfer ? 'Nouvelle classe' : 'Classe'}
          value={classId}
          disabled={classes.isPending}
          error={fieldError}
          onChange={(e) => {
            setClassId(e.target.value);
            setFieldError(null);
          }}
        >
          <option value="">{classes.isPending ? 'Chargement…' : 'Choisir…'}</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {classLabel(c)} (capacité {c.capacity})
            </option>
          ))}
        </SelectField>
      )}

      {!classes.isPending && !classes.error && options.length === 0 && (
        <Alert tone="info">Aucune classe disponible pour cette année : crée-en une dans « Classes ».</Alert>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          {isTransfer ? 'Changer de classe' : 'Inscrire'}
        </Button>
      </div>
    </form>
  );
}

export default function EnrollmentModal({ open, student, enrollment, years, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={enrollment ? 'Changer de classe' : 'Inscrire dans une classe'}>
      <EnrollmentForm student={student} enrollment={enrollment} years={years} onClose={onClose} />
    </Modal>
  );
}