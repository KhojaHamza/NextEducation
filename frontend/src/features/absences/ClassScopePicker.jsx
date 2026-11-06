import SelectField from '../../components/ui/SelectField.jsx';
import ClassPicker from '../classes/ClassPicker.jsx';
import { classLabel } from '../students/format.js';

export default function ClassScopePicker({ scope, allLabel }) {
  if (!scope.isTeacher) {
    return <ClassPicker value={scope.schoolClass} onChange={scope.setSchoolClass} allLabel={allLabel} />;
  }

  return (
    <SelectField
      label="Classe"
      value={scope.schoolClass ? String(scope.schoolClass.id) : ''}
      disabled={scope.mine.isPending}
      onChange={(e) => scope.setSchoolClass(scope.myClasses.find((c) => String(c.id) === e.target.value) ?? null)}
      className="w-full sm:w-64"
    >
      <option value="">{allLabel ?? 'Choisir une classe…'}</option>
      {scope.myClasses.map((c) => (
        <option key={c.id} value={c.id}>
          {classLabel(c)}
        </option>
      ))}
    </SelectField>
  );
}