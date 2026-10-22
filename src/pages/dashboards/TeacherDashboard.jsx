import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import RoleDashboardLayout from './RoleDashboardLayout';
import TimetableWeek from './TimetableWeek';
import {
  getRequestError,
  getResponseData,
  useRoleErrorNavigation,
} from './roleDashboardUtils';

const navigation = [
  { id: 'classes', label: 'Mes classes' },
  { id: 'students', label: 'Mes élèves' },
  { id: 'attendance', label: 'Présences' },
  { id: 'timetable', label: 'Emploi du temps' },
  { id: 'grades', label: 'Notes et évaluations' },
];

const attendanceStatuses = [
  { value: 'PRESENT', label: 'Présent' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'En retard' },
  { value: 'EXCUSED', label: 'Absence justifiée' },
];

function todayLocal() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

function getValidationMessage(error) {
  const errors = error.response?.data?.errors;
  return errors
    ? Object.values(errors).flat().join(' ')
    : error.response?.data?.message || 'Cette opération a échoué.';
}

export default function TeacherDashboard({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [activeSection, setActiveSection] = useState('classes');
  const [students, setStudents] = useState([]);
  const [attendanceClassId, setAttendanceClassId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(todayLocal);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [scheduleYearId, setScheduleYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [grades, setGrades] = useState([]);
  const [assessmentForm, setAssessmentForm] = useState({ label: '', assessment_date: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [error, setError] = useState('');
  const [featureError, setFeatureError] = useState('');
  const [success, setSuccess] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const handleRequestError = useRoleErrorNavigation();

  useEffect(() => {
    let isCurrent = true;

    async function loadAssignments() {
      setError('');
      try {
        const response = await api.get('/teacher/assignments');
        const data = getResponseData(response);
        if (!isCurrent) return;
        setAssignments(data);
        setSelectedAssignmentId((current) => current || String(data[0]?.id ?? ''));
        setAttendanceClassId((current) => current || String(data[0]?.class?.id ?? ''));
      } catch (requestError) {
        if (isCurrent && !handleRequestError(requestError)) setError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadAssignments();
    return () => { isCurrent = false; };
  }, [handleRequestError, reloadKey]);

  const selectedAssignment = assignments.find((item) => String(item.id) === selectedAssignmentId);
  const classes = useMemo(() => (
    [...new Map(assignments.map((item) => [
      `${item.class.id}-${item.class.school_year.id}`,
      { ...item.class, schoolYearId: item.class.school_year.id, schoolYearLabel: item.class.school_year.label },
    ])).values()]
  ), [assignments]);
  const classesCount = classes.length;
  const scheduleYears = useMemo(() => (
    [...new Map(assignments.map((item) => [
      String(item.class.school_year.id),
      { id: String(item.class.school_year.id), label: item.class.school_year.label },
    ])).values()].sort((first, second) => second.label.localeCompare(first.label))
  ), [assignments]);
  const activeScheduleYearId = scheduleYears.some((year) => year.id === scheduleYearId)
    ? scheduleYearId
    : scheduleYears[0]?.id ?? '';

  useEffect(() => {
    if (activeSection !== 'attendance' || !attendanceClassId || !attendanceDate) return undefined;
    let isCurrent = true;

    async function loadAttendance() {
      setIsLoadingAttendance(true);
      setFeatureError('');
      try {
        const response = await api.get('/teacher/attendance', {
          params: { class_id: attendanceClassId, date: attendanceDate },
        });
        if (isCurrent) setAttendanceRecords(getResponseData(response).students);
      } catch (requestError) {
        if (isCurrent && !handleRequestError(requestError)) setFeatureError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoadingAttendance(false);
      }
    }

    loadAttendance();
    return () => { isCurrent = false; };
  }, [activeSection, attendanceClassId, attendanceDate, handleRequestError, reloadKey]);

  useEffect(() => {
    if (activeSection !== 'students') return undefined;
    let isCurrent = true;

    async function loadStudents() {
      try {
        const selectedClass = classes.find((item) => String(item.id) === selectedClassId);
        const response = await api.get('/teacher/students', {
          params: selectedClass
            ? { class_id: selectedClass.id, school_year_id: selectedClass.schoolYearId }
            : undefined,
        });
        if (isCurrent) setStudents(getResponseData(response));
      } catch (requestError) {
        if (isCurrent && !handleRequestError(requestError)) setFeatureError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoadingStudents(false);
      }
    }

    loadStudents();
    return () => { isCurrent = false; };
  }, [activeSection, classes, handleRequestError, selectedClassId, reloadKey]);

  useEffect(() => {
    if (activeSection !== 'timetable' || !activeScheduleYearId) return undefined;
    let isCurrent = true;

    async function loadSchedule() {
      setIsLoadingSchedule(true);
      setFeatureError('');
      try {
        const response = await api.get('/teacher/schedules', {
          params: { school_year_id: activeScheduleYearId },
        });
        if (isCurrent) setScheduleEntries(getResponseData(response));
      } catch (requestError) {
        if (isCurrent && !handleRequestError(requestError)) setFeatureError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoadingSchedule(false);
      }
    }

    loadSchedule();
    return () => { isCurrent = false; };
  }, [activeSection, activeScheduleYearId, handleRequestError, reloadKey]);

  useEffect(() => {
    if (!selectedAssignment) {
      return undefined;
    }

    let isCurrent = true;

    async function loadPeriods() {
      setIsLoadingPeriods(true);
      try {
        const response = await api.get('/periods', {
          params: { school_year_id: selectedAssignment.class.school_year.id },
        });
        const data = getResponseData(response);
        if (!isCurrent) return;
        setPeriods(data);
        setSelectedPeriodId(String(data[0]?.id ?? ''));
      } catch (requestError) {
        if (isCurrent && !handleRequestError(requestError)) setFeatureError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoadingPeriods(false);
      }
    }

    loadPeriods();
    return () => { isCurrent = false; };
  }, [handleRequestError, selectedAssignment, reloadKey]);

  useEffect(() => {
    if (activeSection !== 'grades' || !selectedAssignmentId || !selectedPeriodId) {
      return undefined;
    }

    let isCurrent = true;

    async function loadAssessments() {
      setIsLoadingAssessments(true);
      try {
        const response = await api.get('/assessments', {
          params: { assignment_id: selectedAssignmentId, period_id: selectedPeriodId },
        });
        if (isCurrent) setAssessments(getResponseData(response));
      } catch (requestError) {
        if (isCurrent && !handleRequestError(requestError)) setFeatureError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoadingAssessments(false);
      }
    }

    loadAssessments();
    return () => { isCurrent = false; };
  }, [activeSection, handleRequestError, selectedAssignmentId, selectedPeriodId, reloadKey]);

  useEffect(() => {
    if (activeSection !== 'grades' || !selectedAssessmentId) {
      return undefined;
    }

    let isCurrent = true;

    async function loadGrades() {
      setIsLoadingGrades(true);
      setFeatureError('');
      try {
        const response = await api.get(`/assessments/${selectedAssessmentId}/grades`);
        if (!isCurrent) return;
        setGrades(response.data.students.map((student) => ({
          ...student,
          value: student.value === null ? '' : String(student.value),
          initialValue: student.value === null ? '' : String(student.value),
          appreciation: student.appreciation ?? '',
        })));
      } catch (requestError) {
        if (isCurrent && !handleRequestError(requestError)) setFeatureError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoadingGrades(false);
      }
    }

    loadGrades();
    return () => { isCurrent = false; };
  }, [activeSection, handleRequestError, selectedAssessmentId, reloadKey]);

  async function createAssessment(event) {
    event.preventDefault();
    if (!selectedAssignmentId || !selectedPeriodId) return;
    setFeatureError('');
    setSuccess('');
    setIsCreatingAssessment(true);
    try {
      const response = await api.post('/assessments', {
        assignment_id: Number(selectedAssignmentId),
        period_id: Number(selectedPeriodId),
        label: assessmentForm.label.trim(),
        assessment_date: assessmentForm.assessment_date,
      });
      const assessment = getResponseData(response);
      setAssessments((current) => [...current, assessment]);
      setSelectedAssessmentId(String(assessment.id));
      setAssessmentForm({ label: '', assessment_date: '' });
      setSuccess('L’évaluation a été créée.');
    } catch (requestError) {
      if (!handleRequestError(requestError)) setFeatureError(getValidationMessage(requestError));
    } finally {
      setIsCreatingAssessment(false);
    }
  }

  function updateGrade(studentId, field, value) {
    setGrades((current) => current.map((grade) => {
      if (grade.id !== studentId) return grade;
      if (field === 'value' && value === '' && grade.initialValue !== '') {
        return { ...grade, value: grade.initialValue };
      }
      return { ...grade, [field]: value };
    }));
  }

  async function saveGrades(event) {
    event.preventDefault();
    setFeatureError('');
    setSuccess('');
    const gradeEntries = grades
      .filter((grade) => grade.value !== '')
      .map((grade) => ({
        student_id: grade.id,
        value: Number(grade.value),
        appreciation: grade.appreciation || null,
      }));

    if (gradeEntries.length === 0) {
      setFeatureError('Saisissez au moins une note avant l’enregistrement.');
      return;
    }

    setIsSavingGrades(true);
    try {
      const response = await api.put(`/assessments/${selectedAssessmentId}/grades`, { grades: gradeEntries });
      setAssessments((current) => current.map((assessment) => (
        String(assessment.id) === selectedAssessmentId
          ? { ...assessment, grades_count: response.data.saved_count }
          : assessment
      )));
      setGrades((current) => current.map((grade) => ({ ...grade, initialValue: grade.value })));
      setSuccess('Les notes ont été enregistrées. Les champs laissés vides n’effacent pas les notes existantes.');
    } catch (requestError) {
      if (!handleRequestError(requestError)) setFeatureError(getValidationMessage(requestError));
    } finally {
      setIsSavingGrades(false);
    }
  }

  function updateAttendance(studentId, field, value) {
    setAttendanceRecords((current) => current.map((record) => (
      record.id === studentId ? { ...record, [field]: value } : record
    )));
  }

  async function saveAttendance(event) {
    event.preventDefault();
    if (!attendanceClassId || attendanceRecords.length === 0) return;

    setFeatureError('');
    setSuccess('');
    setIsSavingAttendance(true);
    try {
      const response = await api.put('/teacher/attendance', {
        class_id: Number(attendanceClassId),
        date: attendanceDate,
        records: attendanceRecords.map((record) => ({
          student_id: record.id,
          status: record.status,
          notes: record.notes.trim() || null,
        })),
      });
      const notifiedCount = response.data.data.parent_notifications_count;
      setSuccess(
        `Présences enregistrées pour ${response.data.data.saved_count} élève(s). `
        + `${notifiedCount} notification(s) d’absence envoyée(s) aux parents dans l’application.`,
      );
    } catch (requestError) {
      if (!handleRequestError(requestError)) setFeatureError(getValidationMessage(requestError));
    } finally {
      setIsSavingAttendance(false);
    }
  }

  function handleSectionChange(section) {
    setActiveSection(section);
    setFeatureError('');
    setSuccess('');
    if (section === 'students') setIsLoadingStudents(true);
    if (section === 'attendance') setIsLoadingAttendance(true);
  }

  function handleAssignmentChange(assignmentId) {
    setSelectedAssignmentId(assignmentId);
    setPeriods([]);
    setSelectedPeriodId('');
    setAssessments([]);
    setSelectedAssessmentId('');
    setGrades([]);
    setFeatureError('');
    setSuccess('');
  }

  return (
    <RoleDashboardLayout
      user={user}
      title="Mon espace enseignant"
      description="Vos classes, élèves, évaluations et notes."
      isLoading={isLoading}
      error={error}
      onRetry={() => setReloadKey((key) => key + 1)}
      navigation={navigation}
      activeNavigation={activeSection}
      onNavigationChange={handleSectionChange}
    >
      {activeSection === 'classes' && (
        <>
          <div className="role-dashboard-metrics">
            <article className="role-dashboard-card"><strong>{assignments.length}</strong><span>Matières attribuées</span></article>
            <article className="role-dashboard-card"><strong>{classesCount}</strong><span>Classes suivies</span></article>
          </div>
          <section className="role-dashboard-panel">
            <h2>Mes classes et matières</h2>
            {assignments.length ? (
              <div className="role-dashboard-table-wrap">
                <table className="role-dashboard-table">
                  <thead><tr><th>Classe</th><th>Niveau</th><th>Matière</th><th>Coefficient</th><th>Année scolaire</th></tr></thead>
                  <tbody>{assignments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.class.name}</td>
                      <td>{item.class.level}</td>
                      <td>{item.subject.name}</td>
                      <td>{item.subject.coefficient}</td>
                      <td>{item.class.school_year.label}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="role-dashboard-state">Aucune classe ou matière ne vous a encore été attribuée.</p>}
          </section>
        </>
      )}

      {activeSection === 'students' && (
        <>
          <div className="role-dashboard-toolbar">
            <label>Classe attribuée
              <select value={selectedClassId} onChange={(event) => {
                setSelectedClassId(event.target.value);
                setIsLoadingStudents(true);
                setFeatureError('');
              }}>
                <option value="">Toutes mes classes</option>
                {classes.map((item) => (
                  <option key={`${item.id}-${item.schoolYearId}`} value={item.id}>
                    {item.name} · {item.schoolYearLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {featureError && <div className="role-dashboard-error" role="alert">{featureError}</div>}
          {isLoadingStudents ? <p className="role-dashboard-state">Chargement des élèves…</p> : students.length ? (
            <section className="role-dashboard-panel">
              <h2>Élèves de mes classes</h2>
              <div className="role-dashboard-table-wrap">
                <table className="role-dashboard-table">
                  <thead><tr><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th><th>Année</th></tr></thead>
                  <tbody>{students.map((student) => student.enrollments?.map((enrollment) => (
                    <tr key={`${student.id}-${enrollment.id}`}>
                      <td>{student.matricule}</td>
                      <td>{student.last_name}</td>
                      <td>{student.first_name}</td>
                      <td>{enrollment.class?.name ?? '—'}</td>
                      <td>{enrollment.school_year?.label ?? '—'}</td>
                    </tr>
                  )))}</tbody>
                </table>
              </div>
            </section>
          ) : !featureError && <p className="role-dashboard-state">Aucun élève actif dans les classes qui vous sont attribuées.</p>}
        </>
      )}

      {activeSection === 'attendance' && (
        <>
          <div className="role-dashboard-toolbar">
            <label>Classe attribuée
              <select
                value={attendanceClassId}
                onChange={(event) => {
                  setAttendanceClassId(event.target.value);
                  setIsLoadingAttendance(true);
                  setFeatureError('');
                  setSuccess('');
                }}
              >
                <option value="">Sélectionner une classe</option>
                {classes.map((item) => (
                  <option key={`${item.id}-${item.schoolYearId}`} value={item.id}>
                    {item.name} · {item.schoolYearLabel}
                  </option>
                ))}
              </select>
            </label>
            <label>Date de l’appel
              <input
                type="date"
                value={attendanceDate}
                max={todayLocal()}
                onChange={(event) => {
                  setAttendanceDate(event.target.value);
                  setIsLoadingAttendance(true);
                  setFeatureError('');
                  setSuccess('');
                }}
              />
            </label>
          </div>
          {featureError && <div className="role-dashboard-error" role="alert">{featureError}</div>}
          {success && <p className="role-dashboard-success" role="status">{success}</p>}
          <section className="role-dashboard-panel">
            <h2>Feuille de présence</h2>
            {!attendanceClassId ? (
              <p className="role-dashboard-state">Aucune classe ne vous est attribuée.</p>
            ) : isLoadingAttendance ? (
              <p className="role-dashboard-state">Chargement de la liste des élèves…</p>
            ) : attendanceRecords.length ? (
              <form onSubmit={saveAttendance}>
                <div className="role-dashboard-table-wrap">
                  <table className="role-dashboard-table">
                    <thead><tr><th>Matricule</th><th>Élève</th><th>Statut</th><th>Précision</th></tr></thead>
                    <tbody>{attendanceRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{record.matricule}</td>
                        <td>{record.last_name} {record.first_name}</td>
                        <td>
                          <select
                            className="teacher-attendance-status"
                            value={record.status}
                            onChange={(event) => updateAttendance(record.id, 'status', event.target.value)}
                            aria-label={`Présence de ${record.first_name} ${record.last_name}`}
                          >
                            {attendanceStatuses.map((status) => (
                              <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="teacher-attendance-notes"
                            value={record.notes}
                            maxLength={2000}
                            onChange={(event) => updateAttendance(record.id, 'notes', event.target.value)}
                            placeholder="Motif ou précision (facultatif)"
                            aria-label={`Précision pour ${record.first_name} ${record.last_name}`}
                          />
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="teacher-grade-hint">Les parents reçoivent une notification dans l’application quand un élève est marqué absent.</p>
                <button className="role-dashboard-action" type="submit" disabled={isSavingAttendance}>
                  {isSavingAttendance ? 'Enregistrement…' : 'Enregistrer les présences'}
                </button>
              </form>
            ) : (
              <p className="role-dashboard-state">Aucun élève actif n’est inscrit dans cette classe pour la date sélectionnée.</p>
            )}
          </section>
        </>
      )}

      {activeSection === 'timetable' && (
        <>
          <div className="role-dashboard-toolbar">
            <label>Année scolaire
              <select
                value={activeScheduleYearId}
                onChange={(event) => {
                  setScheduleYearId(event.target.value);
                  setIsLoadingSchedule(true);
                  setFeatureError('');
                }}
                disabled={scheduleYears.length === 0}
              >
                {scheduleYears.map((year) => (
                  <option key={year.id} value={year.id}>{year.label}</option>
                ))}
              </select>
            </label>
          </div>
          {featureError && <div className="role-dashboard-error" role="alert">{featureError}</div>}
          <section className="role-dashboard-panel">
            <h2>Mon emploi du temps hebdomadaire</h2>
            {isLoadingSchedule ? <p className="role-dashboard-state">Chargement des cours…</p> : (
              <TimetableWeek
                entries={scheduleEntries}
                emptyMessage={scheduleYears.length
                  ? 'Aucun cours n’est encore planifié pour vos affectations. Contactez le Directeur ou le Secrétariat.'
                  : 'Aucune classe ne vous est attribuée pour le moment.'}
              />
            )}
          </section>
        </>
      )}

      {activeSection === 'grades' && (
        <>
          <div className="role-dashboard-toolbar teacher-grade-toolbar">
            <label>Matière et classe
              <select value={selectedAssignmentId} onChange={(event) => handleAssignmentChange(event.target.value)}>
                {assignments.map((item) => (
                  <option key={item.id} value={item.id}>{item.class.name} · {item.subject.name} · {item.class.school_year.label}</option>
                ))}
              </select>
            </label>
            <label>Période
              <select value={selectedPeriodId} onChange={(event) => {
                setSelectedPeriodId(event.target.value);
                setAssessments([]);
                setSelectedAssessmentId('');
                setGrades([]);
              }} disabled={isLoadingPeriods || periods.length === 0}>
                {periods.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}
              </select>
            </label>
          </div>
          {featureError && <div className="role-dashboard-error" role="alert">{featureError}</div>}
          {success && <p className="role-dashboard-success" role="status">{success}</p>}
          {!isLoadingPeriods && selectedAssignment && periods.length === 0 && (
            <p className="role-dashboard-state">Aucune période n’est configurée pour cette année. Demandez au Directeur ou au Secrétariat de créer les trimestres.</p>
          )}
          {selectedAssignment && selectedPeriodId && (
            <section className="role-dashboard-panel">
              <h2>Évaluations</h2>
              <form className="teacher-assessment-form" onSubmit={createAssessment}>
                <label>Nom de l’évaluation
                  <input value={assessmentForm.label} maxLength={100} onChange={(event) => setAssessmentForm((current) => ({ ...current, label: event.target.value }))} required />
                </label>
                <label>Date
                  <input type="date" value={assessmentForm.assessment_date} min={periods.find((item) => String(item.id) === selectedPeriodId)?.start_date} max={periods.find((item) => String(item.id) === selectedPeriodId)?.end_date} onChange={(event) => setAssessmentForm((current) => ({ ...current, assessment_date: event.target.value }))} required />
                </label>
                <button className="role-dashboard-action" type="submit" disabled={isCreatingAssessment}>
                  {isCreatingAssessment ? 'Création…' : 'Créer l’évaluation'}
                </button>
              </form>
              {isLoadingAssessments ? <p className="role-dashboard-state">Chargement des évaluations…</p> : assessments.length ? (
                <div className="role-dashboard-assessment-list">
                  {assessments.map((assessment) => (
                    <button
                      type="button"
                      className={String(assessment.id) === selectedAssessmentId ? 'active' : ''}
                      key={assessment.id}
                      onClick={() => {
                        setGrades([]);
                        setFeatureError('');
                        setSelectedAssessmentId(String(assessment.id));
                      }}
                    >
                      <span>{assessment.label}</span>
                      <small>{assessment.assessment_date} · {assessment.grades_count ?? 0} note(s)</small>
                    </button>
                  ))}
                </div>
              ) : <p className="role-dashboard-state">Aucune évaluation pour cette période.</p>}
            </section>
          )}

          {selectedAssessmentId && (
            <section className="role-dashboard-panel">
              <h2>Saisie et modification des notes sur 20</h2>
              {isLoadingGrades ? <p className="role-dashboard-state">Chargement des élèves…</p> : (
                <form onSubmit={saveGrades}>
                  <div className="role-dashboard-table-wrap">
                    <table className="role-dashboard-table">
                      <thead><tr><th>Matricule</th><th>Élève</th><th>Note /20</th><th>Appréciation</th></tr></thead>
                      <tbody>{grades.map((grade) => (
                        <tr key={grade.id}>
                          <td>{grade.matricule}</td>
                          <td>{grade.last_name} {grade.first_name}</td>
                          <td>
                            <input className="teacher-grade-input" type="number" min="0" max="20" step="0.01" value={grade.value} onChange={(event) => updateGrade(grade.id, 'value', event.target.value)} aria-label={`Note de ${grade.first_name} ${grade.last_name}`} />
                          </td>
                          <td>
                            <input className="teacher-appreciation-input" maxLength={1000} value={grade.appreciation} onChange={(event) => updateGrade(grade.id, 'appreciation', event.target.value)} aria-label={`Appréciation de ${grade.first_name} ${grade.last_name}`} />
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                          <p className="teacher-grade-hint">Une case de note laissée vide ne crée pas de note. Les notes déjà enregistrées ne peuvent pas être supprimées ici.</p>
                  <button className="role-dashboard-action" type="submit" disabled={isSavingGrades || grades.length === 0}>
                    {isSavingGrades ? 'Enregistrement…' : 'Enregistrer les notes'}
                  </button>
                </form>
              )}
            </section>
          )}
        </>
      )}
    </RoleDashboardLayout>
  );
}
