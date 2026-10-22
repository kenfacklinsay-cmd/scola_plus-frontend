import { useEffect, useState } from 'react';
import api from '../../api/axios';
import RoleDashboardLayout from './RoleDashboardLayout';
import {
  getRequestError,
  getResponseData,
  useRoleErrorNavigation,
} from './roleDashboardUtils';

function todayLocal() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

export default function SecretariatDashboard({ user }) {
  const [schoolYears, setSchoolYears] = useState([]);
  const [schoolYearId, setSchoolYearId] = useState('');
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(todayLocal);
  const [attendanceClassId, setAttendanceClassId] = useState('');
  const [absences, setAbsences] = useState([]);
  const [isLoadingAbsences, setIsLoadingAbsences] = useState(false);
  const [absenceError, setAbsenceError] = useState('');
  const [pagination, setPagination] = useState({ total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const handleRequestError = useRoleErrorNavigation();

  useEffect(() => {
    let isCurrent = true;

    async function loadSchoolYears() {
      try {
        const response = await api.get('/school-years');
        const years = getResponseData(response);
        if (!isCurrent) return;
        setSchoolYears(years);
        const activeYear = years.find((year) => year.status === 'ONGOING') ?? years[0];
        if (activeYear) setSchoolYearId(String(activeYear.id));
        else setIsLoading(false);
      } catch (requestError) {
        if (!isCurrent) return;
        if (!handleRequestError(requestError)) setError(getRequestError(requestError));
        setIsLoading(false);
      }
    }

    loadSchoolYears();
    return () => { isCurrent = false; };
  }, [handleRequestError]);

  useEffect(() => {
    if (!schoolYearId) return undefined;
    let isCurrent = true;

    async function loadSchoolOverview() {
      setError('');
      try {
        const [studentsResponse, classesResponse] = await Promise.all([
          api.get('/students', { params: { school_year_id: schoolYearId, page: 1 } }),
          api.get('/classes', { params: { school_year_id: schoolYearId } }),
        ]);
        if (!isCurrent) return;
        setStudents(getResponseData(studentsResponse));
        setPagination(studentsResponse.data.meta ?? { total: 0 });
        setClasses(getResponseData(classesResponse));
      } catch (requestError) {
        if (!isCurrent) return;
        if (!handleRequestError(requestError)) setError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadSchoolOverview();
    return () => { isCurrent = false; };
  }, [handleRequestError, reloadKey, schoolYearId]);

  useEffect(() => {
    if (!schoolYearId) return undefined;
    let isCurrent = true;

    async function loadAbsences() {
      setIsLoadingAbsences(true);
      setAbsenceError('');
      try {
        const response = await api.get('/attendance/absences', {
          params: {
            date: attendanceDate,
            class_id: attendanceClassId || undefined,
          },
        });
        if (isCurrent) setAbsences(getResponseData(response));
      } catch (requestError) {
        if (!isCurrent) return;
        if (!handleRequestError(requestError)) setAbsenceError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoadingAbsences(false);
      }
    }

    loadAbsences();
    return () => { isCurrent = false; };
  }, [attendanceClassId, attendanceDate, handleRequestError, schoolYearId]);

  return (
    <RoleDashboardLayout
      user={user}
      title="Espace secrétariat"
      description="Suivi des inscriptions, dossiers élèves et classes."
      isLoading={isLoading}
      error={error}
      onRetry={() => setReloadKey((key) => key + 1)}
    >
      <div className="role-dashboard-toolbar">
        <label>Année scolaire
          <select value={schoolYearId} onChange={(event) => setSchoolYearId(event.target.value)}>
            {schoolYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}
          </select>
        </label>
      </div>
      <div className="role-dashboard-metrics">
        <article className="role-dashboard-card"><strong>{pagination.total ?? students.length}</strong><span>Élèves inscrits</span></article>
        <article className="role-dashboard-card"><strong>{classes.length}</strong><span>Classes</span></article>
      </div>
      <section className="role-dashboard-panel">
        <h2>Derniers dossiers élèves</h2>
        {students.length ? (
          <div className="role-dashboard-table-wrap">
            <table className="role-dashboard-table">
              <thead><tr><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Classe</th></tr></thead>
              <tbody>{students.map((student) => {
                const enrollment = student.enrollments?.find((item) => String(item.school_year?.id) === schoolYearId);
                return (
                  <tr key={student.id}>
                    <td>{student.matricule}</td><td>{student.last_name}</td><td>{student.first_name}</td>
                    <td>{enrollment?.class?.name ?? '—'}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : <p className="role-dashboard-state">{schoolYears.length ? 'Aucun élève inscrit pour cette année.' : 'Aucune année scolaire configurée.'}</p>}
      </section>
      <section className="role-dashboard-panel">
        <div className="parent-data-heading">
          <div>
            <h2>Suivi des absences</h2>
            <p>Élèves marqués absents par les enseignants.</p>
          </div>
        </div>
        <div className="role-dashboard-toolbar">
          <label>Date
            <input
              type="date"
              value={attendanceDate}
              max={todayLocal()}
              onChange={(event) => setAttendanceDate(event.target.value)}
            />
          </label>
          <label>Classe
            <select value={attendanceClassId} onChange={(event) => setAttendanceClassId(event.target.value)}>
              <option value="">Toutes les classes</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
              ))}
            </select>
          </label>
        </div>
        {absenceError && <div className="role-dashboard-error" role="alert">{absenceError}</div>}
        {isLoadingAbsences ? (
          <p className="role-dashboard-state">Chargement des absences…</p>
        ) : absences.length ? (
          <div className="role-dashboard-table-wrap">
            <table className="role-dashboard-table">
              <thead><tr><th>Élève</th><th>Matricule</th><th>Classe</th><th>Précision</th><th>Saisi par</th></tr></thead>
              <tbody>{absences.map((absence) => (
                <tr key={absence.id}>
                  <td>{absence.student.first_name} {absence.student.last_name}</td>
                  <td>{absence.student.matricule}</td>
                  <td>{absence.class.name}</td>
                  <td>{absence.notes || '—'}</td>
                  <td>{absence.marked_by}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <p className="role-dashboard-state">Aucune absence enregistrée pour cette date.</p>
        )}
      </section>
    </RoleDashboardLayout>
  );
}
