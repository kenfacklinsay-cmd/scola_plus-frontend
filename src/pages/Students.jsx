import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, FileDown, ImagePlus, Plus, Search, Users, X } from 'lucide-react';
import api from '../api/axios';
import PdfDownloadLink from '../components/PdfDownloadLink';
import './css/Students.css';

const emptyForm = {
  matricule: '',
  last_name: '',
  first_name: '',
  birth_date: '',
  birth_place: '',
  gender: 'F',
  address: '',
  class_id: '',
  school_year_id: '',
  parent_id: '',
  parent: {
    first_name: '',
    last_name: '',
    telephone: '',
    address: '',
    relationship: '',
  },
};

function emptySchoolYearForm() {
  return {
    label: '',
    start_date: '',
    end_date: '',
    status: 'ONGOING',
  };
}

const emptyClassForm = {
  name: '',
  level: '',
  capacity: '',
};

function responseData(response) {
  return response.data?.data ?? response.data;
}

function errorMessage(error) {
  const validationErrors = error.response?.data?.errors;
  if (validationErrors) {
    return Object.values(validationErrors).flat().join(' ');
  }

  return error.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.';
}

export default function Students() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [parents, setParents] = useState([]);
  const [isLoadingParents, setIsLoadingParents] = useState(true);
  const [parentOptionsError, setParentOptionsError] = useState('');
  const [schoolYears, setSchoolYears] = useState([]);
  const [isLoadingSchoolYears, setIsLoadingSchoolYears] = useState(true);
  const [schoolYearsError, setSchoolYearsError] = useState('');
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [periodError, setPeriodError] = useState('');
  const [classes, setClasses] = useState([]);
  const [classesLoadedForYearId, setClassesLoadedForYearId] = useState('');
  const [schoolYearId, setSchoolYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [classesLoadingForYearId, setClassesLoadingForYearId] = useState('');
  const [classesError, setClassesError] = useState('');
  const [classesErrorForYearId, setClassesErrorForYearId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedParentIds, setSelectedParentIds] = useState({});
  const [linkingStudentId, setLinkingStudentId] = useState('');
  const [parentLinkError, setParentLinkError] = useState('');
  const [parentLinkSuccess, setParentLinkSuccess] = useState('');
  const [isSchoolYearFormOpen, setIsSchoolYearFormOpen] = useState(false);
  const [schoolYearForm, setSchoolYearForm] = useState(emptySchoolYearForm);
  const [schoolYearFormError, setSchoolYearFormError] = useState('');
  const [isSavingSchoolYear, setIsSavingSchoolYear] = useState(false);
  const [isClassFormOpen, setIsClassFormOpen] = useState(false);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [classFormError, setClassFormError] = useState('');
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [reloadSchoolYearsKey, setReloadSchoolYearsKey] = useState(0);
  const [reloadClassesKey, setReloadClassesKey] = useState(0);
  const [photoStudent, setPhotoStudent] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const classesYearId = isFormOpen ? form.school_year_id : schoolYearId;

  const photoPreview = useMemo(
    () => photoFile ? URL.createObjectURL(photoFile) : '',
    [photoFile],
  );

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isCurrent = true;

    async function loadOptions() {
      try {
        const userResponse = await api.get('/user');

        if (!isCurrent) return;
        const account = responseData(userResponse);
        setUser(account);

        if (!['DIRECTEUR', 'SECRETARIAT'].includes(account.role)) {
          setError('Votre compte ne dispose pas des droits pour consulter les élèves.');
          setIsLoading(false);
          return;
        }

        const yearsResponse = await api.get('/school-years');
        if (!isCurrent) return;

        const years = responseData(yearsResponse);
        setSchoolYears(years);
        setSchoolYearsError('');

        const activeYear = years.find((year) => year.status === 'ONGOING') ?? years[0];
        if (activeYear) {
          setSchoolYearId(String(activeYear.id));
          setForm((current) => ({ ...current, school_year_id: String(activeYear.id) }));
        } else {
          setSchoolYearsError('Aucune année scolaire n’est configurée. Créez d’abord une année scolaire.');
        }

        setIsLoadingParents(true);
        try {
          const parentsResponse = await api.get('/parents');
          if (!isCurrent) return;
          setParents(responseData(parentsResponse));
          setParentOptionsError('');
        } catch (parentRequestError) {
          if (!isCurrent) return;
          if (parentRequestError.response?.status === 401) {
            navigate('/login', { replace: true });
            return;
          }
          setParents([]);
          setParentOptionsError(errorMessage(parentRequestError));
        } finally {
          if (isCurrent) setIsLoadingParents(false);
        }
      } catch (requestError) {
        if (!isCurrent) return;
        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }

        setSchoolYearsError(errorMessage(requestError) || 'Impossible de charger les années scolaires.');
      } finally {
        if (isCurrent) {
          setIsLoadingSchoolYears(false);
          setIsLoading(false);
        }
      }
    }

    loadOptions();

    return () => {
      isCurrent = false;
    };
  }, [navigate, reloadSchoolYearsKey]);

  useEffect(() => {
    if (!schoolYearId) return undefined;

    let isCurrent = true;

    async function loadPeriods() {
      setPeriodError('');
      try {
        const response = await api.get('/periods', {
          params: { school_year_id: schoolYearId },
        });
        if (!isCurrent) return;
        const availablePeriods = responseData(response);
        setPeriods(availablePeriods);
        setPeriodId(String(availablePeriods[0]?.id ?? ''));
      } catch (requestError) {
        if (!isCurrent) return;
        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setPeriods([]);
        setPeriodId('');
        setPeriodError(errorMessage(requestError));
      }
    }

    loadPeriods();
    return () => {
      isCurrent = false;
    };
  }, [navigate, schoolYearId]);

  useEffect(() => {
    if (!classesYearId || !user || !['DIRECTEUR', 'SECRETARIAT'].includes(user.role)) {
      return undefined;
    }
    if (classesLoadedForYearId === classesYearId) return undefined;

    let isCurrent = true;

    async function loadClasses() {
      setClassesLoadingForYearId(classesYearId);
      setClassesError('');

      try {
        const response = await api.get('/classes', {
          params: { school_year_id: classesYearId },
        });

        if (!isCurrent) return;
        setClasses(responseData(response));
        setClassesLoadedForYearId(classesYearId);
      } catch (requestError) {
        if (!isCurrent) return;
        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setClasses([]);
        setClassesError(errorMessage(requestError));
        setClassesErrorForYearId(classesYearId);
      } finally {
        if (isCurrent) setClassesLoadingForYearId('');
      }
    }

    loadClasses();

    return () => {
      isCurrent = false;
    };
  }, [classesLoadedForYearId, classesYearId, navigate, reloadClassesKey, user]);

  const loadStudents = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.get('/students', {
        params: {
          page,
          search: search || undefined,
          class_id: classId || undefined,
          school_year_id: schoolYearId || undefined,
        },
      });

      setStudents(response.data.data ?? []);
      setPagination(response.data.meta ?? { current_page: 1, last_page: 1, total: 0 });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setError(errorMessage(requestError) || 'Impossible de charger les élèves.');
    } finally {
      setIsLoading(false);
    }
  }, [classId, navigate, schoolYearId, search]);

  useEffect(() => {
    if (!user || !['DIRECTEUR', 'SECRETARIAT'].includes(user.role)) return undefined;
    let isCurrent = true;

    async function loadPage() {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.get('/students', {
          params: {
            page: 1,
            search: search || undefined,
            class_id: classId || undefined,
            school_year_id: schoolYearId || undefined,
          },
        });

        if (!isCurrent) return;
        setStudents(response.data.data ?? []);
        setPagination(response.data.meta ?? { current_page: 1, last_page: 1, total: 0 });
      } catch (requestError) {
        if (!isCurrent) return;
        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }

        setError(errorMessage(requestError) || 'Impossible de charger les élèves.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadPage();

    return () => {
      isCurrent = false;
    };
  }, [classId, navigate, reloadKey, schoolYearId, search, user]);

  function updateField(event) {
    const { name, value } = event.target;

    if (name.startsWith('parent.')) {
      const parentField = name.slice('parent.'.length);
      setForm((current) => ({
        ...current,
        parent: { ...current.parent, [parentField]: value },
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'school_year_id' ? { class_id: '' } : {}),
    }));

    if (name === 'school_year_id') {
      setClassId('');
    }
  }

  function openRegistrationForm() {
    setForm({
      ...emptyForm,
      school_year_id: schoolYearId,
      class_id: classId,
    });
    setFormError('');
    setIsSchoolYearFormOpen(false);
    setIsClassFormOpen(false);
    setSchoolYearFormError('');
    setClassFormError('');
    setIsFormOpen(true);
  }

  async function handleSchoolYearCreation() {
    setSchoolYearFormError('');
    if (!schoolYearForm.label.trim() || !schoolYearForm.start_date || !schoolYearForm.end_date) {
      setSchoolYearFormError('Renseignez le libellé et les deux dates.');
      return;
    }
    if (schoolYearForm.end_date < schoolYearForm.start_date) {
      setSchoolYearFormError('La date de fin doit suivre la date de début.');
      return;
    }
    setIsSavingSchoolYear(true);

    try {
      const response = await api.post('/school-years', {
        ...schoolYearForm,
        label: schoolYearForm.label.trim(),
      });
      const createdYear = responseData(response);
      setSchoolYears((current) => [...current, createdYear]);
      setSchoolYearsError('');
      setSchoolYearId(String(createdYear.id));
      setForm((current) => ({ ...current, school_year_id: String(createdYear.id), class_id: '' }));
      setClasses([]);
      setClassesLoadedForYearId(String(createdYear.id));
      setIsSchoolYearFormOpen(false);
      setSchoolYearForm(emptySchoolYearForm());
      setIsClassFormOpen(true);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setSchoolYearFormError(errorMessage(requestError));
    } finally {
      setIsSavingSchoolYear(false);
    }
  }

  async function handleClassCreation() {
    setClassFormError('');
    if (!classForm.name.trim() || !classForm.level.trim()) {
      setClassFormError('Renseignez le nom de la classe et le niveau.');
      return;
    }
    setIsSavingClass(true);
    const yearId = form.school_year_id;

    try {
      const response = await api.post('/classes', {
        ...classForm,
        name: classForm.name.trim(),
        level: classForm.level.trim(),
        capacity: classForm.capacity || undefined,
        school_year_id: yearId,
      });
      const createdClass = responseData(response);
      setClasses((current) => [...current, createdClass]);
      setClassesLoadedForYearId(yearId);
      setForm((current) => ({ ...current, class_id: String(createdClass.id) }));
      setIsClassFormOpen(false);
      setClassForm(emptyClassForm);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setClassFormError(errorMessage(requestError));
    } finally {
      setIsSavingClass(false);
    }
  }

  async function handleRegistration(event) {
    event.preventDefault();
    setFormError('');
    setIsSaving(true);

    const payload = {
      ...form,
      matricule: form.matricule.trim() || undefined,
      parent_id: form.parent_id || undefined,
      parent: form.parent_id
        ? { relationship: form.parent.relationship.trim() || undefined }
        : {
          ...form.parent,
          address: form.parent.address.trim() || undefined,
          relationship: form.parent.relationship.trim() || undefined,
        },
    };

    try {
      await api.post('/students', payload);
      setIsFormOpen(false);
      setForm(emptyForm);
      setReloadKey((key) => key + 1);
      try {
        const parentsResponse = await api.get('/parents');
        setParents(responseData(parentsResponse));
        setParentOptionsError('');
      } catch (parentRequestError) {
        if (parentRequestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setParentOptionsError('L’inscription est enregistrée, mais la liste des parents n’a pas pu être actualisée.');
      }
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setFormError(errorMessage(requestError) || 'Impossible d’inscrire cet élève.');
    } finally {
      setIsSaving(false);
    }
  }

  async function linkStudentToParent(student) {
    const parentId = selectedParentIds[student.id];
    if (!parentId) return;

    setParentLinkError('');
    setParentLinkSuccess('');
    setLinkingStudentId(String(student.id));
    try {
      await api.post(`/parents/${parentId}/students/${student.id}`);
      const parent = parents.find((item) => String(item.id) === String(parentId));
      setParentLinkSuccess(
        `${student.first_name} ${student.last_name} est maintenant rattaché à ${parent?.first_name} ${parent?.last_name}.`,
      );
      setSelectedParentIds((current) => ({ ...current, [student.id]: '' }));
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setParentLinkError(errorMessage(requestError));
    } finally {
      setLinkingStudentId('');
    }
  }

  function openPhotoEditor(student) {
    setPhotoStudent(student);
    setPhotoFile(null);
    setPhotoError('');
  }

  function closePhotoEditor() {
    if (isSavingPhoto) return;
    setPhotoStudent(null);
    setPhotoFile(null);
    setPhotoError('');
  }

  async function saveStudentPhoto(event) {
    event.preventDefault();
    if (!photoStudent || !photoFile) {
      setPhotoError('Choisissez une photo avant de continuer.');
      return;
    }

    setPhotoError('');
    setIsSavingPhoto(true);
    const payload = new FormData();
    payload.append('photo', photoFile);
    payload.append('_method', 'PUT');

    try {
      await api.post(`/students/${photoStudent.id}/photo`, payload);
      setPhotoStudent(null);
      setPhotoFile(null);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setPhotoError(errorMessage(requestError));
    } finally {
      setIsSavingPhoto(false);
    }
  }

  async function removeStudentPhoto() {
    if (!photoStudent) return;
    setPhotoError('');
    setIsSavingPhoto(true);
    try {
      await api.delete(`/students/${photoStudent.id}/photo`);
      setPhotoStudent(null);
      setPhotoFile(null);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setPhotoError(errorMessage(requestError));
    } finally {
      setIsSavingPhoto(false);
    }
  }

  const isLoadingClasses = classesLoadingForYearId === classesYearId && Boolean(classesYearId);
  const activeClassesError = classesErrorForYearId === classesYearId ? classesError : '';
  const selectedClassOptions = classesLoadedForYearId === classesYearId ? classes : [];

  return (
    <main className="students-page">
      <header className="students-header">
        <Link className="students-brand" to="/dashboard">
          <span className="students-brand-mark">S+</span>
          ScolaPlus
        </Link>
        <div className="students-header-right">
          {user && <span>{user.firstname} {user.lastname}</span>}
          <Link to="/dashboard"><ArrowLeft size={16} /> Tableau de bord</Link>
        </div>
      </header>

      <section className="students-content">
        <div className="students-title-row">
          <div>
            <p className="students-eyebrow">GESTION SCOLAIRE</p>
            <h1>Élèves</h1>
            <p className="students-subtitle">Rechercher les dossiers et gérer les inscriptions.</p>
          </div>
          <button className="students-add-button" type="button" onClick={openRegistrationForm}>
            <Plus size={17} /> Inscrire un élève
          </button>
        </div>

        <section className="students-panel">
          <div className="students-toolbar">
            <label className="students-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Rechercher un nom ou un matricule"
                aria-label="Rechercher un nom ou un matricule"
              />
            </label>
            <label className="students-filter">
              <span>Année scolaire</span>
              <select
                value={schoolYearId}
                onChange={(event) => {
                  setSchoolYearId(event.target.value);
                  setPeriods([]);
                  setPeriodId('');
                  setClassId('');
                  setIsClassFormOpen(false);
                  setClassFormError('');
                }}
              >
                <option value="">Toutes</option>
                {schoolYears.map((year) => (
                  <option value={year.id} key={year.id}>{year.label}</option>
                ))}
              </select>
            </label>
            <label className="students-filter">
              <span>Classe</span>
              <select value={classId} onChange={(event) => setClassId(event.target.value)}>
                <option value="">Toutes</option>
                {classes
                  .filter((schoolClass) => !schoolYearId || String(schoolClass.school_year?.id) === schoolYearId)
                  .map((schoolClass) => (
                    <option value={schoolClass.id} key={schoolClass.id}>{schoolClass.name}</option>
                  ))}
              </select>
            </label>
            <label className="students-filter">
              <span>Période du bulletin</span>
              <select value={periodId} onChange={(event) => setPeriodId(event.target.value)} disabled={!periods.length}>
                {periods.length
                  ? periods.map((period) => <option value={period.id} key={period.id}>{period.label}</option>)
                  : <option value="">{periodError ? 'Périodes indisponibles' : 'Aucune période'}</option>}
              </select>
            </label>
          </div>
          {periodError && <p className="students-error" role="alert">{periodError}</p>}

          {error && <p className="students-error" role="alert">{error}</p>}
          {parentOptionsError && !isFormOpen && (
            <p className="students-error" role="alert">{parentOptionsError} Le rattachement à un compte parent est indisponible.</p>
          )}
          {parentLinkError && <p className="students-error" role="alert">{parentLinkError}</p>}
          {parentLinkSuccess && <p className="students-success" role="status">{parentLinkSuccess}</p>}

          {isLoading ? (
            <p className="students-state">Chargement des dossiers élèves…</p>
          ) : students.length > 0 ? (
            <>
              <div className="students-table-wrap">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>Élève</th>
                      <th>Matricule</th>
                      <th>Classe</th>
                      <th>Année scolaire</th>
                      <th>Parent / tuteur</th>
                      <th>Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const enrollment = student.enrollments?.find(
                        (item) => !schoolYearId || String(item.school_year?.id) === schoolYearId,
                      ) ?? student.enrollments?.[0];
                      const parent = student.parents?.[0];
                      const linkedParentIds = new Set(student.parents?.map((item) => String(item.id)) ?? []);
                      const availableLinkParents = parents.filter(
                        (item) => item.has_account && !linkedParentIds.has(String(item.id)),
                      );

                      return (
                        <tr key={student.id}>
                          <td>
                            {student.has_photo ? (
                              <img
                                className="student-avatar student-avatar-photo"
                                src={api.getUri({ url: `/students/${student.id}/photo` })}
                                crossOrigin="use-credentials"
                                alt={`Photo de ${student.first_name} ${student.last_name}`}
                              />
                            ) : (
                              <span className="student-avatar">{student.first_name?.[0]}{student.last_name?.[0]}</span>
                            )}
                            <span className="student-name">
                              <strong>{student.first_name} {student.last_name}</strong>
                              <span>{student.gender === 'F' ? 'Fille' : student.gender === 'M' ? 'Garçon' : student.gender}</span>
                            </span>
                          </td>
                          <td>{student.matricule}</td>
                          <td>{enrollment?.class?.name ?? '—'}</td>
                          <td>{enrollment?.school_year?.label ?? '—'}</td>
                          <td>
                            {parent ? (
                              <span className="student-parent">
                                <strong>{parent.first_name} {parent.last_name}</strong>
                                <span>{parent.telephone}</span>
                              </span>
                            ) : '—'}
                            {availableLinkParents.length > 0 && (
                              <div className="student-parent-link">
                                <select
                                  aria-label={`Compte parent pour ${student.first_name} ${student.last_name}`}
                                  value={selectedParentIds[student.id] ?? ''}
                                  onChange={(event) => setSelectedParentIds((current) => ({
                                    ...current,
                                    [student.id]: event.target.value,
                                  }))}
                                >
                                  <option value="">Rattacher à un compte parent…</option>
                                  {availableLinkParents.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.first_name} {item.last_name} · {item.account_email || item.telephone}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => linkStudentToParent(student)}
                                  disabled={!selectedParentIds[student.id] || linkingStudentId === String(student.id)}
                                >
                                  {linkingStudentId === String(student.id) ? 'Rattachement…' : 'Rattacher'}
                                </button>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="student-document-actions">
                              <button type="button" className="student-inline-action" onClick={() => openPhotoEditor(student)}>
                                <ImagePlus size={15} /> {student.has_photo ? 'Modifier photo' : 'Ajouter photo'}
                              </button>
                              {periodId ? (
                                <PdfDownloadLink
                                  url={`/students/${student.id}/periods/${periodId}/bulletin/pdf`}
                                  className="student-inline-action"
                                  fallbackName={`bulletin-${student.matricule}.pdf`}
                                >
                                  <FileDown size={15} /> Bulletin PDF
                                </PdfDownloadLink>
                              ) : <span className="student-document-unavailable">Bulletin indisponible</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="students-pagination">
                <span>{pagination.total} élève(s) · Page {pagination.current_page} sur {pagination.last_page}</span>
                <div>
                  <button
                    type="button"
                    aria-label="Page précédente"
                    disabled={pagination.current_page <= 1 || isLoading}
                    onClick={() => loadStudents(pagination.current_page - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label="Page suivante"
                    disabled={pagination.current_page >= pagination.last_page || isLoading}
                    onClick={() => loadStudents(pagination.current_page + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="students-empty">
              <Users size={28} aria-hidden="true" />
              <strong>Aucun élève trouvé</strong>
              <span>Essayez une autre recherche ou inscrivez un nouvel élève.</span>
            </div>
          )}
        </section>
      </section>

      {isFormOpen && (
        <div
          className="students-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) setIsFormOpen(false);
          }}
        >
          <section className="students-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title">
            <div className="students-modal-heading">
              <div>
                <p className="students-eyebrow">NOUVELLE INSCRIPTION</p>
                <h2 id="registration-title">Inscrire un élève</h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                <X size={20} />
              </button>
            </div>

            <form className="registration-form" onSubmit={handleRegistration}>
              <fieldset>
                <legend>Informations sur l’élève</legend>
                <div className="registration-grid">
                  <label>Nom<input name="last_name" value={form.last_name} onChange={updateField} maxLength={100} required /></label>
                  <label>Prénom<input name="first_name" value={form.first_name} onChange={updateField} maxLength={100} required /></label>
                  <label>Matricule <span>(facultatif)</span><input name="matricule" value={form.matricule} onChange={updateField} maxLength={30} /></label>
                  <label>Date de naissance<input name="birth_date" type="date" max={new Date().toISOString().slice(0, 10)} value={form.birth_date} onChange={updateField} required /></label>
                  <label>Lieu de naissance<input name="birth_place" value={form.birth_place} onChange={updateField} maxLength={150} required /></label>
                  <label>Genre
                    <select name="gender" value={form.gender} onChange={updateField} required>
                      <option value="F">Fille</option>
                      <option value="M">Garçon</option>
                    </select>
                  </label>
                  <label className="registration-full">Adresse de l’élève<textarea name="address" value={form.address} onChange={updateField} maxLength={2000} required /></label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Inscription scolaire</legend>
                <div className="registration-grid">
                  <div className="registration-field">
                    <label htmlFor="registration-school-year">Année scolaire</label>
                    <select
                      id="registration-school-year"
                      name="school_year_id"
                      value={form.school_year_id}
                      onChange={updateField}
                      disabled={isLoadingSchoolYears || Boolean(schoolYearsError)}
                      required
                    >
                      <option value="">
                        {isLoadingSchoolYears
                          ? 'Chargement des années…'
                          : schoolYearsError
                            ? 'Années indisponibles'
                            : schoolYears.length
                              ? 'Choisir une année'
                              : 'Aucune année configurée'}
                      </option>
                      {schoolYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}
                    </select>
                    {schoolYearsError && (
                      <span className="registration-field-error" role="alert">
                        {schoolYearsError}
                        <button
                          type="button"
                          onClick={() => {
                            setIsLoadingSchoolYears(true);
                            setSchoolYearsError('');
                            setReloadSchoolYearsKey((key) => key + 1);
                          }}
                        >
                          Réessayer
                        </button>
                        {user?.role === 'DIRECTEUR' && (
                          <button type="button" onClick={() => setIsSchoolYearFormOpen((open) => !open)}>
                            {isSchoolYearFormOpen ? 'Annuler' : 'Créer une année'}
                          </button>
                        )}

                      </span>
                    )}
                    {schoolYears.length === 0 && !schoolYearsError && user?.role === 'DIRECTEUR' && (
                      <button
                        className="registration-inline-action"
                        type="button"
                        onClick={() => setIsSchoolYearFormOpen((open) => !open)}
                      >
                        {isSchoolYearFormOpen ? 'Annuler' : 'Créer une année scolaire'}
                      </button>
                    )}
                    {isSchoolYearFormOpen && user?.role === 'DIRECTEUR' && (
                      <div className="registration-setup-form">
                        <strong>Nouvelle année scolaire</strong>
                        <label>Libellé (ex. 2026-2027)
                          <input
                            value={schoolYearForm.label}
                            onChange={(event) => setSchoolYearForm((current) => ({ ...current, label: event.target.value }))}
                            maxLength={20}
                            required
                          />
                        </label>
                        <div className="registration-setup-grid">
                          <label>Date de début
                            <input
                              type="date"
                              value={schoolYearForm.start_date}
                              onChange={(event) => setSchoolYearForm((current) => ({ ...current, start_date: event.target.value }))}
                              required
                            />
                          </label>
                          <label>Date de fin
                            <input
                              type="date"
                              value={schoolYearForm.end_date}
                              onChange={(event) => setSchoolYearForm((current) => ({ ...current, end_date: event.target.value }))}
                              min={schoolYearForm.start_date}
                              required
                            />
                          </label>
                        </div>
                        <label>Statut
                          <select
                            value={schoolYearForm.status}
                            onChange={(event) => setSchoolYearForm((current) => ({ ...current, status: event.target.value }))}
                          >
                            <option value="ONGOING">En cours</option>
                            <option value="UPCOMING">À venir</option>
                          </select>
                        </label>
                        {schoolYearFormError && <span className="registration-field-error" role="alert">{schoolYearFormError}</span>}
                        <button
                          className="students-add-button"
                          type="button"
                          onClick={handleSchoolYearCreation}
                          disabled={isSavingSchoolYear}
                        >
                          {isSavingSchoolYear ? 'Création…' : 'Enregistrer l’année'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="registration-field">
                    <label htmlFor="registration-class">Classe</label>
                    <select
                      id="registration-class"
                      name="class_id"
                      value={form.class_id}
                      onChange={updateField}
                      disabled={!form.school_year_id || isLoadingClasses || Boolean(activeClassesError)}
                      required
                    >
                      <option value="">
                        {isLoadingClasses
                          ? 'Chargement des classes…'
                          : activeClassesError
                            ? 'Classes indisponibles'
                            : selectedClassOptions.length
                              ? 'Choisir une classe'
                              : 'Aucune classe pour cette année'}
                      </option>
                      {selectedClassOptions.map((schoolClass) => (
                        <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name} · {schoolClass.level}</option>
                      ))}
                    </select>
                    {activeClassesError && (
                      <span className="registration-field-error" role="alert">
                        {activeClassesError}
                        <button type="button" onClick={() => setReloadClassesKey((key) => key + 1)}>
                          Réessayer
                        </button>
                      </span>
                    )}
                    {form.school_year_id && !isLoadingClasses && !activeClassesError
                      && selectedClassOptions.length === 0 && user?.role === 'DIRECTEUR' && (
                        <button
                          className="registration-inline-action"
                          type="button"
                          onClick={() => setIsClassFormOpen((open) => !open)}
                        >
                          {isClassFormOpen ? 'Annuler' : 'Créer une classe'}
                        </button>
                    )}
                    {isClassFormOpen && user?.role === 'DIRECTEUR' && (
                      <div className="registration-setup-form">
                        <strong>Nouvelle classe · {schoolYears.find((year) => String(year.id) === form.school_year_id)?.label}</strong>
                        <label>Nom de la classe
                          <input
                            value={classForm.name}
                            onChange={(event) => setClassForm((current) => ({ ...current, name: event.target.value }))}
                            maxLength={100}
                            required
                          />
                        </label>
                        <div className="registration-setup-grid">
                          <label>Niveau
                            <input
                              value={classForm.level}
                              onChange={(event) => setClassForm((current) => ({ ...current, level: event.target.value }))}
                              maxLength={50}
                              required
                            />
                          </label>
                          <label>Capacité <span>(facultatif)</span>
                            <input
                              type="number"
                              min="1"
                              max="65535"
                              value={classForm.capacity}
                              onChange={(event) => setClassForm((current) => ({ ...current, capacity: event.target.value }))}
                            />
                          </label>
                        </div>
                        {classFormError && <span className="registration-field-error" role="alert">{classFormError}</span>}
                        <button
                          className="students-add-button"
                          type="button"
                          onClick={handleClassCreation}
                          disabled={isSavingClass}
                        >
                          {isSavingClass ? 'Création…' : 'Enregistrer la classe'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Parent ou tuteur</legend>
                <div className="registration-grid">
                  <label className="registration-full">Profil parent
                    <select
                      name="parent_id"
                      value={form.parent_id}
                      onChange={updateField}
                      disabled={isLoadingParents}
                    >
                      <option value="">
                        {isLoadingParents ? 'Chargement des parents…' : 'Créer un nouveau profil parent'}
                      </option>
                      {parents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.first_name} {parent.last_name} · {parent.telephone}
                          {parent.has_account
                            ? ` · ${parent.account_email || 'compte activé'}`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {parentOptionsError && (
                    <p className="registration-full students-error" role="alert">
                      {parentOptionsError} Vous pouvez toujours créer un nouveau profil parent.
                    </p>
                  )}
                  {form.parent_id ? (
                    <p className="registration-full">
                      L’élève sera ajouté au profil parent sélectionné et apparaîtra dans son espace parent.
                    </p>
                  ) : (
                    <>
                      <label>Nom<input name="parent.last_name" value={form.parent.last_name} onChange={updateField} maxLength={100} required /></label>
                      <label>Prénom<input name="parent.first_name" value={form.parent.first_name} onChange={updateField} maxLength={100} required /></label>
                      <label>Téléphone<input name="parent.telephone" type="tel" value={form.parent.telephone} onChange={updateField} maxLength={20} required /></label>
                      <label className="registration-full">Adresse du parent <span>(facultatif)</span><textarea name="parent.address" value={form.parent.address} onChange={updateField} maxLength={2000} /></label>
                    </>
                  )}
                  <label>Lien avec l’élève<input name="parent.relationship" value={form.parent.relationship} onChange={updateField} maxLength={50} placeholder="Ex. mère, père, tuteur" /></label>
                </div>
              </fieldset>

              {formError && <p className="students-error" role="alert">{formError}</p>}

              <div className="registration-actions">
                <button className="registration-cancel" type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving || isSavingSchoolYear || isSavingClass}>Annuler</button>
                <button className="students-add-button" type="submit" disabled={isSaving || !schoolYearId || !form.school_year_id || !form.class_id}>
                  {isSaving ? 'Enregistrement…' : 'Enregistrer l’inscription'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {photoStudent && (
        <div
          className="students-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePhotoEditor();
          }}
        >
          <section className="students-photo-modal" role="dialog" aria-modal="true" aria-labelledby="student-photo-title">
            <div className="students-modal-heading">
              <div>
                <p className="students-eyebrow">DOSSIER ÉLÈVE</p>
                <h2 id="student-photo-title">Photo de {photoStudent.first_name} {photoStudent.last_name}</h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={closePhotoEditor} disabled={isSavingPhoto}>
                <X size={20} />
              </button>
            </div>
            <form className="student-photo-form" onSubmit={saveStudentPhoto}>
              <div className="student-photo-preview">
                {photoPreview ? (
                  <img src={photoPreview} alt="Aperçu de la nouvelle photo" />
                ) : photoStudent.has_photo ? (
                  <img
                    src={api.getUri({ url: `/students/${photoStudent.id}/photo` })}
                    crossOrigin="use-credentials"
                    alt="Photo actuelle de l’élève"
                  />
                ) : (
                  <span>{photoStudent.first_name?.[0]}{photoStudent.last_name?.[0]}</span>
                )}
              </div>
              <label className="student-photo-picker">
                <ImagePlus size={17} />
                <span>{photoFile?.name ?? 'Choisir une photo (JPG, PNG ou WebP)'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    setPhotoFile(event.target.files?.[0] ?? null);
                    setPhotoError('');
                  }}
                />
              </label>
              <p className="student-photo-help">Format JPG, PNG ou WebP · 5 Mo maximum · 3000 × 3000 px maximum.</p>
              {photoError && <p className="students-error" role="alert">{photoError}</p>}
              <div className="registration-actions">
                {photoStudent.has_photo && (
                  <button className="registration-cancel" type="button" onClick={removeStudentPhoto} disabled={isSavingPhoto}>
                    Supprimer la photo
                  </button>
                )}
                <button className="registration-cancel" type="button" onClick={closePhotoEditor} disabled={isSavingPhoto}>
                  Annuler
                </button>
                <button className="students-add-button" type="submit" disabled={isSavingPhoto || !photoFile}>
                  {isSavingPhoto ? 'Enregistrement…' : 'Enregistrer la photo'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
