import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import RoleDashboardLayout from './RoleDashboardLayout';
import TimetableWeek from './TimetableWeek';
import { weekdays } from './timetableConstants';

const blankForm = {
  assignment_id: '',
  day_of_week: '1',
  start_time: '',
  end_time: '',
  room: '',
};

function responseData(response) {
  return response.data?.data ?? response.data;
}

function getErrorMessage(error) {
  const errors = error.response?.data?.errors;
  return errors
    ? Object.values(errors).flat().join(' ')
    : error.response?.data?.message || 'Une erreur est survenue.';
}

function sortEntries(entries) {
  return [...entries].sort((first, second) => (
    first.day_of_week - second.day_of_week || first.start_time.localeCompare(second.start_time)
  ));
}

async function loadAllAssignments(yearId) {
  const collected = [];
  let currentPage = 1;
  let lastPage;

  do {
    const response = await api.get('/assignments', {
      params: { school_year_id: yearId, page: currentPage },
    });
    collected.push(...responseData(response));
    lastPage = response.data.meta?.last_page ?? 1;
    currentPage += 1;
  } while (currentPage <= lastPage);

  return collected;
}

export default function ScheduleManagement({ user, isStandalone = false }) {
  const navigate = useNavigate();
  const [schoolYears, setSchoolYears] = useState([]);
  const [schoolYearId, setSchoolYearId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState('');
  const [isLoadingYears, setIsLoadingYears] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function loadYears() {
      try {
        const response = await api.get('/school-years');
        const years = responseData(response);
        if (!isCurrent) return;
        setSchoolYears(years);
        const activeYear = years.find((year) => year.status === 'ONGOING') ?? years[0];
        if (activeYear) setSchoolYearId(String(activeYear.id));
      } catch (requestError) {
        if (!isCurrent) return;
        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError(getErrorMessage(requestError));
      } finally {
        if (isCurrent) setIsLoadingYears(false);
      }
    }

    loadYears();
    return () => { isCurrent = false; };
  }, [navigate]);

  useEffect(() => {
    if (!schoolYearId) return undefined;
    let isCurrent = true;

    async function loadScheduleData() {
      setIsLoading(true);
      setError('');
      try {
        const [assignmentsResponse, schedulesResponse] = await Promise.all([
          loadAllAssignments(schoolYearId),
          api.get('/schedules', { params: { school_year_id: schoolYearId } }),
        ]);
        if (!isCurrent) return;
        const schedules = responseData(schedulesResponse);
        const firstAssignment = assignmentsResponse[0];
        setAssignments(assignmentsResponse);
        setEntries(sortEntries(schedules));
        setSelectedClassId(String(firstAssignment?.class.id ?? ''));
        setForm((current) => ({
          ...current,
          assignment_id: String(firstAssignment?.id ?? ''),
        }));
      } catch (requestError) {
        if (!isCurrent) return;
        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError(getErrorMessage(requestError));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadScheduleData();
    return () => { isCurrent = false; };
  }, [navigate, schoolYearId]);

  function cancelEdit() {
    setEditingId('');
    const classAssignments = assignments.filter(
      (assignment) => String(assignment.class.id) === selectedClassId,
    );
    setForm({ ...blankForm, assignment_id: String(classAssignments[0]?.id ?? '') });
    setError('');
    setSuccess('');
  }

  function startEdit(entry) {
    setEditingId(String(entry.id));
    setSelectedClassId(String(entry.assignment.class.id));
    setForm({
      assignment_id: String(entry.assignment.id),
      day_of_week: String(entry.day_of_week),
      start_time: entry.start_time,
      end_time: entry.end_time,
      room: entry.room || '',
    });
    setError('');
    setSuccess('');
  }

  async function saveEntry(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    const payload = {
      ...form,
      assignment_id: Number(form.assignment_id),
      day_of_week: Number(form.day_of_week),
      room: form.room.trim() || null,
    };

    try {
      const response = editingId
        ? await api.put(`/schedules/${editingId}`, payload)
        : await api.post('/schedules', payload);
      const entry = responseData(response);
      setEntries((current) => sortEntries(editingId
        ? current.map((item) => item.id === entry.id ? entry : item)
        : [...current, entry]));
      setSuccess(editingId ? 'Le créneau a été modifié.' : 'Le créneau a été ajouté à l’emploi du temps.');
      setEditingId('');
      const classAssignments = assignments.filter(
        (assignment) => String(assignment.class.id) === selectedClassId,
      );
      setForm({ ...blankForm, assignment_id: String(classAssignments[0]?.id ?? '') });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEntry(entry) {
    if (!window.confirm(`Supprimer le cours ${entry.assignment.subject} de ${weekdays[entry.day_of_week - 1].label} ?`)) return;
    setError('');
    setSuccess('');
    setPendingDeleteId(String(entry.id));
    try {
      await api.delete(`/schedules/${entry.id}`);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      if (editingId === String(entry.id)) cancelEdit();
      setSuccess('Le créneau a été supprimé.');
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setError(getErrorMessage(requestError));
    } finally {
      setPendingDeleteId('');
    }
  }

  const content = (
    <section className={isStandalone ? 'schedule-management' : 'director-management schedule-management'}>
      {!isStandalone && (
        <div className="director-page-heading">
          <div>
            <h1>Emploi du temps</h1>
            <p>Créez le planning hebdomadaire. Les enseignants ne verront que leurs propres cours.</p>
          </div>
        </div>
      )}
      {isStandalone && <Link className="schedule-back-link" to="/dashboard">← Retour au tableau de bord</Link>}

      {error && <div className={isStandalone ? 'role-dashboard-error' : 'director-alert'} role="alert">{error}</div>}
      {success && <p className={isStandalone ? 'role-dashboard-success' : 'account-success'} role="status">{success}</p>}

      <div className="schedule-year-selector">
        <label>Année scolaire
          <select value={schoolYearId} onChange={(event) => {
            setSchoolYearId(event.target.value);
            setAssignments([]);
            setEntries([]);
            setSelectedClassId('');
            setForm(blankForm);
            setEditingId('');
          }}>
            {schoolYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}
          </select>
        </label>
      </div>

      {isLoadingYears ? <p className="director-loading">Chargement des années scolaires…</p> : schoolYears.length === 0 ? (
        <p className="director-empty">Aucune année scolaire n’est configurée.</p>
      ) : (
        <>
          {assignments.length > 0 ? (
            <form className="schedule-entry-form" onSubmit={saveEntry}>
              <div className="schedule-form-heading">
                <h2>{editingId ? 'Modifier un cours' : 'Ajouter un cours'}</h2>
                <p>Choisissez une classe, son cours, puis le jour et les heures. Répétez pour compléter la semaine.</p>
              </div>
              <label>1. Classe
                <select
                  value={selectedClassId}
                  onChange={(event) => {
                    const classId = event.target.value;
                    const classAssignments = assignments.filter(
                      (assignment) => String(assignment.class.id) === classId,
                    );
                    setSelectedClassId(classId);
                    setForm((current) => ({
                      ...current,
                      assignment_id: String(classAssignments[0]?.id ?? ''),
                    }));
                  }}
                  required
                  disabled={isLoading || Boolean(editingId)}
                >
                  {[...new Map(assignments.map((assignment) => [
                    String(assignment.class.id),
                    assignment.class,
                  ])).values()].map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
                  ))}
                </select>
              </label>
              <label>2. Matière et enseignant
                <select
                  name="assignment_id"
                  value={form.assignment_id}
                  onChange={(event) => setForm((current) => ({ ...current, assignment_id: event.target.value }))}
                  required
                  disabled={isLoading || !selectedClassId}
                >
                  {assignments
                    .filter((assignment) => String(assignment.class.id) === selectedClassId)
                    .map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.subject.name} · {assignment.teacher.firstname} {assignment.teacher.lastname}
                      </option>
                    ))}
                </select>
              </label>
              <label>3. Jour
                <select name="day_of_week" value={form.day_of_week} onChange={(event) => setForm((current) => ({ ...current, day_of_week: event.target.value }))}>
                  {weekdays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
              </label>
              <label>4. Début<input type="time" value={form.start_time} onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))} required /></label>
              <label>5. Fin<input type="time" value={form.end_time} onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))} required /></label>
              <details className="schedule-optional-room">
                <summary>Salle (facultatif)</summary>
                <input aria-label="Salle" value={form.room} maxLength={80} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} />
              </details>
              <div className="schedule-form-actions">
                <button className="director-export-button" type="submit" disabled={isSaving || isLoading}>
                  {isSaving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Ajouter le créneau'}
                </button>
                {editingId && <button className="schedule-cancel-button" type="button" onClick={cancelEdit}>Annuler</button>}
              </div>
            </form>
          ) : (
            <section className="schedule-setup-guide">
              <div className="schedule-setup-guide-icon" aria-hidden="true">!</div>
              <div>
                <h2>Préparez d’abord les classes et les cours</h2>
                <p>
                  Aucun cours n’est encore affecté pour l’année {schoolYears.find((year) => String(year.id) === schoolYearId)?.label}.
                  Les classes ne viennent pas préremplies : créez-les dans l’application, puis liez une matière et un enseignant à chacune.
                </p>
                <ol>
                  <li>Ouvrez « Classes &amp; Matières » et créez au moins une classe.</li>
                  <li>Ajoutez la matière si elle n’existe pas encore.</li>
                  <li>Créez un compte enseignant dans « Créer des comptes ».</li>
                  <li>Associez la classe, la matière et l’enseignant, puis revenez ici.</li>
                </ol>
                {user?.role === 'DIRECTEUR' ? (
                  <Link className="schedule-setup-guide-link" to="/dashboard/classes">
                    Configurer les classes et les affectations
                  </Link>
                ) : (
                  <p className="schedule-setup-guide-contact">
                    Demandez au Directeur d’ouvrir « Classes &amp; Matières » et de créer les affectations nécessaires.
                  </p>
                )}
              </div>
            </section>
          )}

          <div className="director-data-table-wrap">
            <h2 className="director-table-title">Planning hebdomadaire · {schoolYears.find((year) => String(year.id) === schoolYearId)?.label}</h2>
            {isLoading ? <p className="director-loading">Chargement de l’emploi du temps…</p> : entries.length ? (
              <TimetableWeek
                entries={entries}
                showTeacher
                onEdit={startEdit}
                onDelete={deleteEntry}
                pendingDeleteId={pendingDeleteId}
              />
            ) : <p className="director-empty">Aucun cours n’est encore planifié pour cette année.</p>}
          </div>
        </>
      )}
    </section>
  );

  return isStandalone
    ? <RoleDashboardLayout user={user} title="Emploi du temps" description="Configuration du planning hebdomadaire.">{content}</RoleDashboardLayout>
    : content;
}
