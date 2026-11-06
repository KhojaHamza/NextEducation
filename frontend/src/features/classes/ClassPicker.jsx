import { useState } from 'react';
import SelectField from '../../components/ui/SelectField.jsx';
import { classLabel } from '../students/format.js';
import { useClassesOfYear } from '../students/linkHooks.js';
import { useSchoolYears } from './hooks.js';

// Year + class pickers. value: the selected class object (or null). onChange receives the class object (or null).
export default function ClassPicker({ value, onChange, allLabel }) {
  const years = useSchoolYears();
  const [pickedYear, setPickedYear] = useState(null);

  const yearList = years.data ?? [];
  const defaultYear = yearList.find((y) => y.isCurrent) ?? yearList[0];
  const yearId = pickedYear ?? (defaultYear ? String(defaultYear.id) : '');

  const classes = useClassesOfYear(yearId);
  const list = classes.data ?? [];

  const changeYear = (e) => {
    setPickedYear(e.target.value);
    onChange(null);
  };
  const changeClass = (e) => onChange(list.find((c) => String(c.id) === e.target.value) ?? null);

  return (
    <div className="flex flex-wrap gap-4">
      <SelectField
        label="Année scolaire"
        value={yearId}
        disabled={years.isPending || yearList.length === 0}
        onChange={changeYear}
        className="w-full sm:w-56"
      >
        {yearList.map((y) => (
          <option key={y.id} value={y.id}>
            {y.label}
            {y.isCurrent ? ' (en cours)' : ''}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Classe"
        value={value ? String(value.id) : ''}
        disabled={!yearId || classes.isPending}
        onChange={changeClass}
        className="w-full sm:w-56"
      >
        <option value="">{allLabel ?? 'Choisir une classe…'}</option>
        {list.map((c) => (
          <option key={c.id} value={c.id}>
            {classLabel(c)}
          </option>
        ))}
      </SelectField>
    </div>
  );
}