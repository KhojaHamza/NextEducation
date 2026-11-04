import { Presentation, Users } from 'lucide-react';

// Teachers and parents share the same backend factory: one page, two configurations
export const peopleConfig = {
  teachers: {
    resource: 'teachers',
    title: 'Enseignants',
    description: 'Les enseignants de l’école.',
    icon: Presentation,
    newLabel: 'Nouvel enseignant',
    editTitle: 'Modifier l’enseignant',
    emptyTitle: 'Aucun enseignant pour l’instant',
    fields: [
      { name: 'speciality', label: 'Spécialité', type: 'text', hint: 'Facultatif : par exemple Mathématiques.' },
      { name: 'hiredAt', label: 'Date d’embauche', type: 'date', hint: 'Facultatif.' },
    ],
  },
  parents: {
    resource: 'parents',
    title: 'Parents',
    description: 'Les parents et tuteurs des élèves.',
    icon: Users,
    newLabel: 'Nouveau parent',
    editTitle: 'Modifier le parent',
    emptyTitle: 'Aucun parent pour l’instant',
    fields: [{ name: 'address', label: 'Adresse', type: 'text', hint: 'Facultatif.' }],
  },
};