import { useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { api } from '../../api/client.js';
import { saveFile } from '../../api/download.js';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../hooks/useToast.js';

// BOM + semicolon so Excel (French locale) opens the template correctly
const TEMPLATE = '\uFEFFlastName;firstName;birthDate;gender;class;parentEmail\r\nBen Ali;Yassine;2019-03-14;MALE;;\r\n';

const describe = (err) => {
  if (err.status === 0) return { message: err.message, issues: [] };

  // The backend sends the list of faulty lines with the 400 error
  const raw = err.body?.errors ?? err.body?.details ?? err.body?.data;
  const issues = Array.isArray(raw) ? raw : [];

  if (err.status === 400 && issues.length) {
    return {
      message: 'Le fichier est refusé : rien n’a été importé. Corrige les lignes ci-dessous puis réessaie.',
      issues,
    };
  }
  if (err.status === 400) return { message: `Fichier refusé : ${err.message}`, issues: [] };
  return { message: 'Import impossible pour le moment. Réessaie dans un instant.', issues: [] };
};

export default function ImportStudentsModal({ open, onClose }) {
  const inputId = useId();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState(null); // { message, issues }

  const close = () => {
    setFile(null);
    setProblem(null);
    onClose();
  };

  const downloadTemplate = () =>
    saveFile(
      { blob: new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' }), filename: 'modele-import-eleves.csv' },
    );

  const submit = async () => {
    if (!file) {
      setProblem({ message: 'Choisis d’abord un fichier .csv.', issues: [] });
      return;
    }
    setLoading(true);
    setProblem(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await api('/students/import', { method: 'POST', body: form });
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      const n = result.imported ?? 0;
      toast.success(`${n} élève${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''}.`);
      close();
    } catch (err) {
      setProblem(describe(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Importer des élèves" size="lg">
      <div className="space-y-5">
        <div>
          <p className="font-bold">Colonnes du fichier .csv</p>
          <ul className="mt-1 list-disc space-y-1 ps-5">
            <li>
              <strong>lastName</strong>, <strong>firstName</strong>, <strong>birthDate</strong> (AAAA-MM-JJ) et{' '}
              <strong>gender</strong> (MALE, FEMALE, M ou F) sont obligatoires.
            </li>
            <li>
              <strong>class</strong> (par exemple « CE1 A ») doit déjà exister dans l’année scolaire en cours.
            </li>
            <li>
              <strong>parentEmail</strong> : l’e-mail d’un parent déjà créé.
            </li>
          </ul>
          <p className="mt-2 text-sm text-ink/70">
            Virgule ou point-virgule, 1000 lignes et 2 Mo au maximum. Si une ligne est fausse, rien n’est importé.
          </p>
        </div>

        <Button variant="secondary" onClick={downloadTemplate}>
          <Download className="size-4" aria-hidden="true" />
          Télécharger le modèle
        </Button>

        <div>
          <label htmlFor={inputId} className="mb-1.5 block font-bold">
            Fichier
          </label>
          <input
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block min-h-11 w-full rounded-xl border-2 border-ink/15 bg-paper p-2 file:me-4 file:rounded-lg file:border-0 file:bg-sky file:px-4 file:py-2 file:font-bold file:text-white"
          />
        </div>

        {problem && (
          <Alert tone="danger" title="Import impossible">
            <p>{problem.message}</p>
            {problem.issues.length > 0 && (
              <div className="mt-3 max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="pe-3 text-start">Ligne</th>
                      <th scope="col" className="pe-3 text-start">Champ</th>
                      <th scope="col" className="text-start">Problème</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problem.issues.map((issue, i) => (
                      <tr key={i}>
                        <td className="pe-3">{issue.line}</td>
                        <td className="pe-3">{issue.field}</td>
                        <td>{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Alert>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={close}>
            Annuler
          </Button>
          <Button onClick={submit} loading={loading}>
            Importer
          </Button>
        </div>
      </div>
    </Modal>
  );
}