import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const initialForms = {
  class: { name: '', level: '', capacity: '' },
  subject: { name: '', coefficient: '1' },
  assignment: { class_id: '', subject_id: '', teacher_id: '' },
};

function requestErrorMessage(error) {
  const errors = error.response?.data?.errors;
  return errors
    ? Object.values(errors).flat().join(' ')
    : error.response?.data?.message || 'Impossible d’enregistrer les changements.';
}

export default function SchoolStructureManager({
  schoolYearId,
  classes,
  subjects,
  teachers,
  onSaved,
}) {
  const [forms, setForms] = useState(initialForms);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const selectedClassId = classes.some(
    (schoolClass) => String(schoolClass.id) === forms.assignment.class_id,
  ) ? forms.assignment.class_id : String(classes[0]?.id ?? '');

  function updateForm(section, field, value) {
    setForms((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  }

  async function saveResource(event, section, endpoint, payload) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const response = await api.post(endpoint, payload);
      const item = response.data?.data ?? response.data;
      setForms((current) => ({ ...current, [section]: initialForms[section] }));
      setSuccess(section === 'assignment'
        ? 'Affectation enregistrée. Cette classe et ce cours sont maintenant disponibles dans l’emploi du temps.'
        : 'Configuration enregistrée. Vous pouvez continuer avec l’étape suivante.');
      onSaved(section === 'class' ? 'classes' : `${section}s`, item);
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="school-structure-setup">
      <div className="school-structure-setup-heading">
        <h2>Configurer l’établissement</h2>
        <p>
          Tout se fait ici dans l’application, pas directement dans la base de données.
          Pour qu’une classe apparaisse dans le planning, créez-la puis associez-lui une matière et un enseignant.
        </p>
      </div>
      {error && <p className="school-structure-error" role="alert">{error}</p>}
      {success && <p className="role-dashboard-success" role="status">{success}</p>}

      <div className="school-structure-forms">
        <form
          className="school-structure-form"
          onSubmit={(event) => saveResource(event, 'class', '/classes', {
            ...forms.class,
            capacity: forms.class.capacity || undefined,
            school_year_id: Number(schoolYearId),
          })}
        >
          <h3>1. Créer une classe</h3>
          <label>Nom de la classe
            <input
              value={forms.class.name}
              onChange={(event) => updateForm('class', 'name', event.target.value)}
              placeholder="Ex. 6ème A"
              required
            />
          </label>
          <label>Niveau
            <input
              value={forms.class.level}
              onChange={(event) => updateForm('class', 'level', event.target.value)}
              placeholder="Ex. Collège"
              required
            />
          </label>
          <label>Effectif maximum <span>(facultatif)</span>
            <input
              type="number"
              min="1"
              value={forms.class.capacity}
              onChange={(event) => updateForm('class', 'capacity', event.target.value)}
            />
          </label>
          <button type="submit" disabled={isSaving || !schoolYearId}>
            {isSaving ? 'Enregistrement…' : 'Créer la classe'}
          </button>
        </form>

        <form
          className="school-structure-form"
          onSubmit={(event) => saveResource(event, 'subject', '/subjects', {
            ...forms.subject,
            coefficient: Number(forms.subject.coefficient),
          })}
        >
          <h3>2. Ajouter une matière</h3>
          <label>Nom de la matière
            <input
              value={forms.subject.name}
              onChange={(event) => updateForm('subject', 'name', event.target.value)}
              placeholder="Ex. Mathématiques"
              required
            />
          </label>
          <label>Coefficient
            <input
              type="number"
              min="1"
              value={forms.subject.coefficient}
              onChange={(event) => updateForm('subject', 'coefficient', event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Enregistrement…' : 'Ajouter la matière'}
          </button>
        </form>

        <form
          className="school-structure-form"
          onSubmit={(event) => saveResource(event, 'assignment', '/assignments', {
            ...forms.assignment,
            class_id: Number(selectedClassId),
            subject_id: Number(forms.assignment.subject_id),
            teacher_id: Number(forms.assignment.teacher_id),
          })}
        >
          <h3>3. Affecter une matière et un enseignant</h3>
          <label>Classe
            <select
              value={selectedClassId}
              onChange={(event) => updateForm('assignment', 'class_id', event.target.value)}
              required
              disabled={!classes.length}
            >
              {classes.length
                ? classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
                ))
                : <option value="">Créez d’abord une classe</option>}
            </select>
          </label>
          <label>Matière
            <select
              value={forms.assignment.subject_id}
              onChange={(event) => updateForm('assignment', 'subject_id', event.target.value)}
              required
              disabled={!subjects.length}
            >
              <option value="">{subjects.length ? 'Choisir une matière' : 'Ajoutez d’abord une matière'}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </label>
          <label>Enseignant
            <select
              value={forms.assignment.teacher_id}
              onChange={(event) => updateForm('assignment', 'teacher_id', event.target.value)}
              required
              disabled={!teachers.length}
            >
              <option value="">{teachers.length ? 'Choisir un enseignant' : 'Créez d’abord un compte enseignant'}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstname} {teacher.lastname}
                </option>
              ))}
            </select>
          </label>
          {!teachers.length && (
            <p className="school-structure-hint">
              <Link to="/dashboard/accounts">Créer un compte enseignant</Link>, puis revenir ici.
            </p>
          )}
          <button type="submit" disabled={isSaving || !classes.length || !subjects.length || !teachers.length}>
            {isSaving ? 'Enregistrement…' : 'Associer à la classe'}
          </button>
        </form>
      </div>
    </section>
  );
}
