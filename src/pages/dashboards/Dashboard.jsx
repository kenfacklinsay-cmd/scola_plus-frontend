import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  CalendarClock,
  ChartNoAxesColumn,
  ChevronLeft,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  School,
  UserRoundPlus,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import api from '../../api/axios';
import PdfDownloadLink from '../../components/PdfDownloadLink';
import DirectorAccounts from './DirectorAccounts';
import RecordPaymentForm from './RecordPaymentForm';
import RoleDashboardRouter from './RoleDashboardRouter';
import SchoolStructureManager from './SchoolStructureManager';
import ScheduleManagement from './ScheduleManagement';
import TuitionFeeSetup from './TuitionFeeSetup';
import '../css/Dashboard.css';

const roles = [
  { label: 'Tableau de bord', icon: GraduationCap, section: 'dashboard' },
  { label: 'Enseignants', icon: BookOpen, section: 'teachers' },
  { label: 'Secrétariat', icon: Users, section: 'secretariat' },
  { label: 'Comptabilité', icon: Wallet, section: 'accounting' },
  { label: 'Parents', icon: UserRound, section: 'parents' },
];

const menuItems = [
  { label: 'Tableau de bord', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Classes & Matières', icon: School, to: '/dashboard/classes' },
  { label: 'Élèves', icon: Users, to: '/students' },
  { label: 'Statistiques', icon: ChartNoAxesColumn, to: '/dashboard/statistics' },
  { label: 'Emploi du temps', icon: CalendarClock, to: '/dashboard/schedule' },
  { label: 'Créer des comptes', icon: UserRoundPlus, to: '/dashboard/accounts' },
];

const chartColors = ['#4b82ed', '#16bd87', '#eda31d', '#e64759', '#8849ec', '#16a1b2'];
const trimesterLabels = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];

function resourceData(response) {
  return response.data?.data ?? response.data;
}

function resourceCollection(response) {
  const data = resourceData(response);
  return Array.isArray(data) ? data : data?.data ?? [];
}

async function loadAllResourcePages(endpoint, params = {}) {
  const items = [];
  let currentPage = 1;
  let lastPage;

  do {
    const response = await api.get(endpoint, { params: { ...params, page: currentPage } });
    items.push(...resourceCollection(response));
    lastPage = response.data?.meta?.last_page ?? 1;
    currentPage += 1;
  } while (currentPage <= lastPage);

  return items;
}

function displayAmount(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
}

function getGradeMention(average) {
  if (average === null || average === undefined) return 'Sans note';
  if (average >= 16) return 'Très Bien';
  if (average >= 14) return 'Bien';
  if (average >= 12) return 'Assez Bien';
  if (average >= 10) return 'Passable';
  return 'Insuffisant';
}

function getPeriodShortLabel(label, index) {
  const period = label?.match(/(séquence|sequence|trimestre)\s*(\d+)/i);
  if (!period) return `T${index + 1}`;
  return /trimestre/i.test(period[1]) ? `T${period[2]}` : `S${period[2]}`;
}

function downloadOverviewCsv(overview) {
  const rows = [
    ['Classe', 'Niveau', 'Effectif', 'Élèves avec moyenne', 'Moyenne / 20'],
    ...overview.class_averages.map((item) => [
      item.class_name,
      item.level,
      item.students_count,
      item.students_with_average_count,
      item.average ?? '',
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `scolaplus-${overview.school_year?.label ?? 'annee'}-${overview.period?.label ?? 'periode'}.csv`
    .replaceAll(' ', '-')
    .replaceAll(/[^\p{L}\p{N}._-]/gu, '');
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname.split('/')[2] || 'dashboard';
  const [user, setUser] = useState(null);
  const [schoolYears, setSchoolYears] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [schoolYearId, setSchoolYearId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [periodForm, setPeriodForm] = useState({
    label: 'Trimestre 1',
    start_date: '',
    end_date: '',
  });
  const [periodFormError, setPeriodFormError] = useState('');
  const [isSavingPeriod, setIsSavingPeriod] = useState(false);
  const [isPeriodFormOpen, setIsPeriodFormOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentPaymentsError, setRecentPaymentsError] = useState('');
  const [isLoadingRecentPayments, setIsLoadingRecentPayments] = useState(false);
  const [recentPaymentsReloadKey, setRecentPaymentsReloadKey] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sectionData, setSectionData] = useState(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function loadAccountAndYears() {
      setIsLoading(true);
      setError('');

      try {
        const accountResponse = await api.get('/user');
        const account = resourceData(accountResponse);

        if (!isCurrent) return;
        setUser(account);

        if (account.role !== 'DIRECTEUR') {
          setIsLoading(false);
          return;
        }

        const yearsResponse = await api.get('/school-years');
        const years = resourceData(yearsResponse);

        if (!isCurrent) return;
        setSchoolYears(years);

        const activeYear = years.find((year) => year.status === 'ONGOING') ?? years[0];
        if (activeYear) {
          setSchoolYearId(String(activeYear.id));
        } else {
          setError('Aucune année scolaire n’est encore configurée.');
        }
        setIsLoading(false);
      } catch (requestError) {
        if (!isCurrent) return;

        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }

        setError(requestError.response?.data?.message || 'Impossible de charger votre espace.');
        setIsLoading(false);
      }
    }

    loadAccountAndYears();

    return () => {
      isCurrent = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (section !== 'dashboard' || !schoolYearId || user?.role !== 'DIRECTEUR') return undefined;
    let isCurrent = true;

    async function loadPeriods() {
      setPeriods([]);
      setPeriodId('');
      setOverview(null);
      setIsLoading(true);
      setError('');

      try {
        const response = await api.get('/periods', {
          params: { school_year_id: schoolYearId },
        });
        const items = resourceData(response);

        if (!isCurrent) return;
        setPeriods(items);
        if (items.length > 0) {
          setPeriodId(String(items[0].id));
        } else {
          setIsLoading(false);
        }
      } catch (requestError) {
        if (!isCurrent) return;
        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError(requestError.response?.data?.message || 'Impossible de charger les périodes scolaires.');
        setIsLoading(false);
      }
    }

    loadPeriods();

    return () => {
      isCurrent = false;
    };
  }, [navigate, schoolYearId, section, user?.role]);

  async function createPeriod(event) {
    event.preventDefault();
    setPeriodFormError('');
    setIsSavingPeriod(true);

    try {
      const response = await api.post('/periods', {
        ...periodForm,
        school_year_id: Number(schoolYearId),
      });
      const period = resourceData(response);
      setIsLoading(true);
      setPeriods((current) => [...current, period].sort((first, second) => first.start_date.localeCompare(second.start_date)));
      setPeriodId(String(period.id));
      setPeriodForm({
        label: trimesterLabels.find((label) => !periods.some((item) => item.label === label) && label !== period.label) ?? 'Trimestre 1',
        start_date: '',
        end_date: '',
      });
      setIsPeriodFormOpen(false);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      const errors = requestError.response?.data?.errors;
      setPeriodFormError(errors
        ? Object.values(errors).flat().join(' ')
        : requestError.response?.data?.message || 'Impossible de créer ce trimestre.');
    } finally {
      setIsSavingPeriod(false);
    }
  }

  useEffect(() => {
    if (section !== 'dashboard' || !schoolYearId || !periodId || user?.role !== 'DIRECTEUR') return undefined;
    let isCurrent = true;

    async function loadOverview() {
      try {
        const response = await api.get('/dashboard/overview', {
          params: { school_year_id: schoolYearId, period_id: periodId },
        });

        if (isCurrent) {
          setOverview(resourceData(response));
          setError('');
        }
      } catch (requestError) {
        if (!isCurrent) return;

        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }

        setError(requestError.response?.data?.message || 'Impossible de charger le tableau de bord.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadOverview();

    return () => {
      isCurrent = false;
    };
  }, [navigate, periodId, reloadKey, schoolYearId, section, user?.role]);

  useEffect(() => {
    if (section !== 'dashboard' || !schoolYearId || user?.role !== 'DIRECTEUR') return undefined;
    let isCurrent = true;

    async function loadRecentPayments() {
      setIsLoadingRecentPayments(true);
      setRecentPaymentsError('');
      try {
        const response = await api.get('/payments', {
          params: { school_year_id: schoolYearId, page: 1 },
        });
        if (!isCurrent) return;
        setRecentPayments(resourceCollection(response).filter((payment) => payment.status === 'PAID').slice(0, 4));
      } catch (requestError) {
        if (!isCurrent) return;
        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setRecentPaymentsError(requestError.response?.data?.message || 'Impossible de charger les derniers paiements.');
      } finally {
        if (isCurrent) setIsLoadingRecentPayments(false);
      }
    }

    loadRecentPayments();
    return () => {
      isCurrent = false;
    };
  }, [navigate, recentPaymentsReloadKey, schoolYearId, section, user?.role]);

  useEffect(() => {
    if (
      section === 'dashboard'
      || section === 'accounts'
      || section === 'schedule'
      || user?.role !== 'DIRECTEUR'
      || (section !== 'parents' && !schoolYearId)
    ) return undefined;
    let isCurrent = true;

    async function loadSection() {
      setSectionLoading(true);
      setSectionError('');
      setSectionData(null);

      try {
        let data;
        if (section === 'teachers') {
          const [teachersResponse, assignmentsResponse] = await Promise.all([
            api.get('/teachers'),
            api.get('/assignments', { params: { school_year_id: schoolYearId || undefined } }),
          ]);
          data = {
            teachers: resourceData(teachersResponse),
            assignments: resourceData(assignmentsResponse),
          };
        } else if (section === 'secretariat') {
          const response = await api.get('/students', { params: { page: 1, school_year_id: schoolYearId || undefined } });
          data = response.data;
        } else if (section === 'accounting') {
          const [overviewResponse, paymentsResponse, feesResponse, classesResponse] = await Promise.all([
            api.get('/finance/overview', { params: { school_year_id: schoolYearId } }),
            api.get('/payments', { params: { school_year_id: schoolYearId } }),
            api.get('/tuition-fees', { params: { school_year_id: schoolYearId } }),
            api.get('/classes', { params: { school_year_id: schoolYearId } }),
          ]);
          data = {
            overview: resourceData(overviewResponse),
            payments: resourceCollection(paymentsResponse),
            fees: resourceCollection(feesResponse),
            classes: resourceCollection(classesResponse),
          };
        } else if (section === 'parents') {
          const response = await api.get('/parents');
          data = resourceData(response);
        } else if (section === 'classes') {
          const [classes, subjects, assignments, teachersResponse] = await Promise.all([
            loadAllResourcePages('/classes', { school_year_id: schoolYearId || undefined }),
            loadAllResourcePages('/subjects'),
            loadAllResourcePages('/assignments', { school_year_id: schoolYearId || undefined }),
            api.get('/teachers'),
          ]);
          data = {
            classes,
            subjects,
            assignments,
            teachers: resourceData(teachersResponse),
          };
        } else if (section === 'statistics') {
          const periodsResponse = await api.get('/periods', {
            params: { school_year_id: schoolYearId || undefined },
          });
          const availablePeriods = resourceData(periodsResponse);
          const selectedPeriod = availablePeriods.find((period) => String(period.id) === periodId)
            ?? availablePeriods[0];
          setPeriods(availablePeriods);

          if (!selectedPeriod) {
            data = { overview: null, periods: availablePeriods };
          } else {
            setPeriodId(String(selectedPeriod.id));
            const overviewResponse = await api.get('/dashboard/overview', {
              params: { school_year_id: schoolYearId, period_id: selectedPeriod.id },
            });
            data = { overview: resourceData(overviewResponse), periods: availablePeriods };
          }
        } else {
          throw new Error('Cette rubrique est introuvable.');
        }

        if (isCurrent) setSectionData(data);
      } catch (requestError) {
        if (!isCurrent) return;
        if (requestError.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setSectionError(requestError.response?.data?.message || requestError.message || 'Impossible de charger cette rubrique.');
      } finally {
        if (isCurrent) setSectionLoading(false);
      }
    }

    if (section !== 'accounting' || schoolYearId) loadSection();
    return () => {
      isCurrent = false;
    };
  }, [navigate, periodId, reloadKey, schoolYearId, section, user?.role]);

  async function handleLogout() {
    setIsLoggingOut(true);
    setError('');

    try {
      await api.post('/logout');
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'La déconnexion a échoué.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  const finance = overview?.finance;
  const financeExpected = Number(finance?.total_expected) || 0;
  const financeReceived = Number(finance?.total_received) || 0;
  const financeRemaining = Number(finance?.remaining_total) || 0;
  const collectionRate = financeExpected > 0
    ? Math.min(100, Math.round((financeReceived / financeExpected) * 100))
    : 0;
  const initials = [user?.firstname?.[0], user?.lastname?.[0]].filter(Boolean).join('').toUpperCase();
  const activePeriod = periods.find((period) => String(period.id) === periodId);

  if (user && user.role !== 'DIRECTEUR') {
    if (user.role === 'SECRETARIAT' && section === 'accounts') {
    return <DirectorAccounts user={user} currentUserId={user.id} isStandalone />;
    }
    if (user.role === 'SECRETARIAT' && section === 'schedule') {
      return <ScheduleManagement user={user} isStandalone />;
    }
    return <RoleDashboardRouter user={user} />;
  }

  return (
    <main className={`director-app${isSidebarCollapsed ? ' director-app-collapsed' : ''}${isMobileMenuOpen ? ' director-app-menu-open' : ''}`}>
      {isMobileMenuOpen && (
        <button
          className="director-sidebar-scrim"
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className="director-sidebar">
        <Link className="director-brand" to="/" aria-label="ScolaPlus, accueil">
          <span className="director-brand-mark">S+</span>
          <span className="director-brand-name">Scola<span>Plus</span></span>
        </Link>
        <button
          className="director-sidebar-close"
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X size={19} />
        </button>

        <div className="director-side-scroll">
          <p className="director-nav-caption">ESPACE</p>
          <nav className="director-role-nav" aria-label="Gestion de l’établissement">
            {roles.map(({ label, icon: Icon, section: itemSection }) => (
              <Link
                key={label}
                className={`director-role-link${itemSection === section ? ' active' : ''}`}
                to={itemSection === 'dashboard' ? '/dashboard' : `/dashboard/${itemSection}`}
                aria-current={itemSection === section ? 'page' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="director-sidebar-divider" />
          <p className="director-nav-caption">MENU</p>
          <nav className="director-menu-nav" aria-label="Menu principal">
            {menuItems.map(({ label, icon: Icon, to, disabled }) => (
              disabled ? (
                <span className="director-menu-link disabled" key={label} title="Bientôt disponible">
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                  <small>Bientôt</small>
                </span>
              ) : (
                <Link
                  key={label}
                  className={`director-menu-link${location.pathname === to ? ' active' : ''}`}
                  to={to}
                  aria-current={location.pathname === to ? 'page' : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              )
            ))}
          </nav>
        </div>

        <div className="director-sidebar-account">
          <span className="director-account-avatar">{initials || 'S+'}</span>
          <span className="director-account-name">
            <strong>{user ? `${user.firstname} ${user.lastname}` : 'Chargement…'}</strong>
            <span>{user?.role === 'DIRECTEUR' ? 'Directeur' : user?.role ?? ''}</span>
          </span>
          <button
            className="director-account-logout"
            type="button"
            aria-label="Se déconnecter"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <section className="director-main">
        <header className="director-topbar">
          <button
            className="director-mobile-menu"
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={21} />
          </button>
          <button
            className="director-collapse-button"
            type="button"
            aria-label={isSidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="director-topbar-context">
            <strong>{roles.find((item) => item.section === section)?.label ?? menuItems.find((item) => item.to === location.pathname)?.label ?? 'Directeur'}</strong>
            <span>Année scolaire {overview?.school_year?.label ?? schoolYears.find((year) => String(year.id) === schoolYearId)?.label ?? '—'}</span>
          </div>
          <div className="director-topbar-actions">
            <Bell size={19} aria-hidden="true" />
            <span className="director-topbar-avatar">{initials || 'S+'}</span>
          </div>
        </header>

        <section className="director-dashboard-content">
          {user?.role === 'DIRECTEUR' && section !== 'dashboard' ? (
            section === 'accounts' ? (
              <DirectorAccounts currentUserId={user.id} />
            ) : section === 'schedule' ? (
              <ScheduleManagement user={user} />
            ) : <DirectorManagementSection
              section={section}
              data={sectionData}
              isLoading={sectionLoading}
              error={sectionError}
              schoolYear={schoolYears.find((year) => String(year.id) === schoolYearId)}
              schoolYears={schoolYears}
              schoolYearId={schoolYearId}
              onSchoolYearChange={(value) => setSchoolYearId(value)}
              onPeriodChange={(value) => setPeriodId(value)}
              onRetry={() => {
                setSectionError('');
                setReloadKey((key) => key + 1);
              }}
              onAccountingDataChanged={() => {
                setSectionLoading(true);
                setSectionData(null);
                setReloadKey((key) => key + 1);
              }}
              onPaymentRecorded={(payment) => {
                setRecentPayments((current) => [
                  payment,
                  ...current.filter((item) => String(item.id) !== String(payment.id)),
                ].slice(0, 4));
                setOverview((current) => {
                  if (!current) return current;
                  const amount = Number(payment.amount) || 0;
                  return {
                    ...current,
                    finance: {
                      ...current.finance,
                      total_received: (Number(current.finance?.total_received) || 0) + amount,
                      remaining_total: Math.max(0, (Number(current.finance?.remaining_total) || 0) - amount),
                    },
                  };
                });
                setSectionData((current) => {
                  if (!current) return current;

                  const previousPayments = current.payments ?? [];
                  const payments = [
                    payment,
                    ...previousPayments.filter((item) => String(item.id) !== String(payment.id)),
                  ];
                  const amount = Number(payment.amount) || 0;

                  return {
                    ...current,
                    payments,
                    overview: {
                      ...current.overview,
                      total_received: (Number(current.overview.total_received) || 0) + amount,
                      remaining_total: Math.max(0, (Number(current.overview.remaining_total) || 0) - amount),
                    },
                  };
                });
              }}
              onStructureSaved={(collection, item) => {
                setSectionData((current) => current
                  ? { ...current, [collection]: [...current[collection], item] }
                  : current);
              }}
            />
          ) : user?.role === 'DIRECTEUR' ? (
            <>
              <div className="director-page-heading">
                <div>
                  <h1>Tableau de bord</h1>
                  <p>Vue globale de l’établissement — Année {overview?.school_year?.label ?? schoolYears.find((year) => String(year.id) === schoolYearId)?.label ?? '—'}</p>
                </div>
                <div className="director-page-actions">
                  {periods.map((period, index) => (
                    <button
                      className={`director-period-button${String(period.id) === periodId ? ' active' : ''}`}
                      key={period.id}
                      type="button"
                      onClick={() => {
                        setIsLoading(true);
                        setError('');
                        setPeriodId(String(period.id));
                      }}
                    >
                      {getPeriodShortLabel(period.label, index)}
                    </button>
                  ))}
                  <label className="director-year-select">
                    <span className="sr-only">Année scolaire</span>
                    <select
                      aria-label="Année scolaire"
                      value={schoolYearId}
                      onChange={(event) => {
                        setIsLoading(true);
                        setError('');
                        setSchoolYearId(event.target.value);
                      }}
                    >
                      {schoolYears.map((year) => (
                        <option value={year.id} key={year.id}>{year.label}</option>
                      ))}
                    </select>
                  </label>
                  {periods.length < trimesterLabels.length && (
                    <button
                      className="director-export-button"
                      type="button"
                      onClick={() => setIsPeriodFormOpen((isOpen) => !isOpen)}
                    >
                      {isPeriodFormOpen ? 'Fermer' : 'Ajouter un trimestre'}
                    </button>
                  )}
                  <button
                    className="director-export-button"
                    type="button"
                    onClick={() => overview && downloadOverviewCsv(overview)}
                    disabled={!overview}
                  >
                    <span aria-hidden="true">📥</span> Exporter
                  </button>
                </div>
              </div>

              {isPeriodFormOpen && (
                <PeriodSetupForm
                  form={periodForm}
                  error={periodFormError}
                  isSaving={isSavingPeriod}
                  onChange={(event) => setPeriodForm((current) => ({ ...current, [event.target.name]: event.target.value }))}
                  onSubmit={createPeriod}
                  availableLabels={trimesterLabels.filter((label) => !periods.some((period) => period.label === label))}
                />
              )}

              {error && (
                <div className="director-alert" role="alert">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoading(true);
                      setError('');
                      setReloadKey((key) => key + 1);
                    }}
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {isLoading && <p className="director-loading">Chargement des indicateurs…</p>}

              {!isLoading && schoolYearId && periods.length === 0 && (
                <PeriodSetupForm
                  form={periodForm}
                  error={periodFormError}
                  isSaving={isSavingPeriod}
                  onChange={(event) => setPeriodForm((current) => ({ ...current, [event.target.name]: event.target.value }))}
                  onSubmit={createPeriod}
                  availableLabels={trimesterLabels}
                />
              )}

              {!isLoading && overview && (
                <>
                  <div className="director-metric-grid">
                    <article className="director-metric-card metric-students">
                      <div className="director-metric-label"><span>ÉLÈVES INSCRITS</span><span aria-hidden="true">👨‍🎓</span></div>
                      <strong>{overview.metrics.students_enrolled}</strong>
                      <span className="director-metric-foot">Effectif de l’année scolaire</span>
                    </article>
                    <article className="director-metric-card metric-classes">
                      <div className="director-metric-label"><span>CLASSES ACTIVES</span><span aria-hidden="true">🏫</span></div>
                      <strong>{overview.metrics.classes_active}</strong>
                      <span className="director-metric-foot">Toutes les classes</span>
                    </article>
                    <article className="director-metric-card metric-received">
                      <div className="director-metric-label"><span>ENCAISSÉ (FCFA)</span><span aria-hidden="true">💰</span></div>
                      <strong>{displayAmount(finance?.total_received)}</strong>
                      <span className="director-metric-foot">Frais de scolarité</span>
                    </article>
                    <article className="director-metric-card metric-overdue">
                      <div className="director-metric-label"><span>ÉLÈVES IMPAYÉS</span><span aria-hidden="true">⚠️</span></div>
                      <strong>{finance?.overdue_students_count ?? 0}</strong>
                      <span className="director-metric-foot">En retard de paiement</span>
                    </article>
                  </div>

                  <div className="director-dashboard-grid">
                    <section className="director-widget director-averages-widget">
                      <div className="director-widget-heading">
                        <div>
                          <h2>Moyennes par classe</h2>
                          <p>{activePeriod?.label ?? overview.period?.label} · /20</p>
                        </div>
                        <span className="director-widget-count">{overview.class_averages.length} classe(s)</span>
                      </div>
                      {overview.class_averages.length > 0 ? (
                        <div className="director-average-list">
                          {overview.class_averages.map((item, index) => {
                            const average = Number(item.average);
                            const hasAverage = item.average !== null && Number.isFinite(average);
                            const percentage = hasAverage ? Math.max(0, Math.min(100, (average / 20) * 100)) : 0;

                            return (
                              <div className="director-average-row" key={item.class_id}>
                                <span className="director-average-class">{item.class_name}</span>
                                <div className="director-average-track" aria-label={hasAverage ? `${average} sur 20` : 'Pas de moyenne'}>
                                  <span
                                    className="director-average-fill"
                                    style={{ width: `${percentage}%`, backgroundColor: chartColors[index % chartColors.length] }}
                                  />
                                </div>
                                <strong className="director-average-value">{hasAverage ? average.toFixed(1) : '—'}</strong>
                                <span className={`director-grade-mention mention-${getGradeMention(item.average).toLowerCase().replaceAll(' ', '-')}`}>
                                  {getGradeMention(item.average)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="director-empty">Aucune classe n’est enregistrée pour cette année scolaire.</p>
                      )}
                    </section>

                    <section className="director-widget director-finance-widget">
                      <div className="director-widget-heading">
                        <div>
                          <h2>Situation financière</h2>
                          <p>Frais de scolarité {overview.school_year?.label}</p>
                        </div>
                        <Wallet size={21} aria-hidden="true" />
                      </div>
                      <div className="director-finance-chart">
                        <div
                          className="director-donut"
                          style={{ '--collection-rate': `${collectionRate}%` }}
                          role="img"
                          aria-label={`Taux d’encaissement : ${collectionRate}%`}
                        >
                          <div>
                            <span>Taux</span>
                            <strong>{collectionRate}%</strong>
                          </div>
                        </div>
                      </div>
                      <div className="director-finance-legend">
                        <div><span className="legend-received" />Encaissé<strong>{displayAmount(financeReceived)} F</strong></div>
                        <div><span className="legend-remaining" />Restant à percevoir<strong>{displayAmount(financeRemaining)} F</strong></div>
                      </div>
                    </section>
                  </div>

                  <div className="director-dashboard-detail-grid">
                    <section className="director-widget director-recent-payments-widget">
                      <div className="director-widget-heading">
                        <div>
                          <h2>Derniers paiements</h2>
                          <p>Encaissements de l’année scolaire</p>
                        </div>
                        <Link className="director-widget-link" to="/dashboard/accounting">Voir tout</Link>
                      </div>
                      {recentPaymentsError ? (
                        <div className="director-widget-state director-widget-error" role="alert">
                          <span>{recentPaymentsError}</span>
                          <button type="button" onClick={() => setRecentPaymentsReloadKey((key) => key + 1)}>Réessayer</button>
                        </div>
                      ) : isLoadingRecentPayments ? (
                        <p className="director-widget-state">Chargement des paiements…</p>
                      ) : recentPayments.length ? (
                        <div className="director-recent-payments-list">
                          {recentPayments.map((payment) => {
                            const studentName = [payment.student?.first_name, payment.student?.last_name]
                              .filter(Boolean)
                              .join(' ');
                            const initials = studentName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2);
                            const paymentDate = payment.payment_date
                              ? new Date(payment.payment_date).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                              : 'Date inconnue';

                            return (
                              <div className="director-recent-payment-row" key={payment.id}>
                                <span className="director-payment-avatar" aria-hidden="true">{initials || 'É'}</span>
                                <div className="director-payment-student">
                                  <strong>{studentName || 'Élève'}</strong>
                                  <span>
                                    {payment.installment?.tuition_fee?.class?.name ?? 'Classe'}
                                    {' · '}{paymentDate}
                                  </span>
                                </div>
                                <div className="director-payment-amount">
                                  <strong>{displayAmount(payment.amount)} F</strong>
                                  <span>{payment.installment?.label ?? 'Tranche'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="director-widget-state">Aucun paiement enregistré pour cette année scolaire.</p>
                      )}
                    </section>

                    <section className="director-widget director-class-enrollment-widget">
                      <div className="director-widget-heading">
                        <div>
                          <h2>Effectifs par classe</h2>
                          <p>Inscrits et moyenne · {activePeriod?.label ?? overview.period?.label} /20</p>
                        </div>
                        <Link className="director-widget-link" to="/dashboard/statistics">Voir tout</Link>
                      </div>
                      {overview.class_averages.length ? (
                        <div className="director-class-table-wrap">
                          <table className="director-class-table">
                            <thead>
                              <tr><th>Classe</th><th>Effectif</th><th>Moyenne</th></tr>
                            </thead>
                            <tbody>
                              {overview.class_averages.map((item) => (
                                <tr key={item.class_id}>
                                  <td>{item.class_name}</td>
                                  <td>{item.students_count}</td>
                                  <td className={
                                    item.average === null
                                      ? 'director-class-average-empty'
                                      : Number(item.average) >= 14
                                        ? 'director-class-average-high'
                                        : Number(item.average) >= 10
                                          ? 'director-class-average-medium'
                                          : 'director-class-average-low'
                                  }>
                                    {item.average === null ? '—' : Number(item.average).toFixed(1)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="director-widget-state">Aucune classe n’est enregistrée pour cette année scolaire.</p>
                      )}
                    </section>
                  </div>
                </>
              )}
            </>
          ) : user ? (
            <RoleDashboardRouter user={user} />
          ) : !isLoading && !error ? (
            <p className="director-loading">Chargement de votre espace…</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function PeriodSetupForm({ form, error, isSaving, onChange, onSubmit, availableLabels }) {
  return (
    <form className="director-period-setup" onSubmit={onSubmit}>
      <div>
        <h2>Configurer les trimestres</h2>
        <p>Choisissez le libellé et les dates. Chaque trimestre doit rester dans l’année scolaire et ne pas chevaucher les autres.</p>
      </div>
      <label>Trimestre
        <select name="label" value={form.label} onChange={onChange} required>
          {availableLabels.map((label) => <option key={label} value={label}>{label}</option>)}
        </select>
      </label>
      <label>Date de début<input name="start_date" type="date" value={form.start_date} onChange={onChange} required /></label>
      <label>Date de fin<input name="end_date" type="date" value={form.end_date} onChange={onChange} min={form.start_date || undefined} required /></label>
      {error && <p className="director-period-error" role="alert">{error}</p>}
      <button className="director-export-button" type="submit" disabled={isSaving || availableLabels.length === 0}>
        {isSaving ? 'Enregistrement…' : 'Enregistrer ce trimestre'}
      </button>
    </form>
  );
}

function DirectorManagementSection({
  section,
  data,
  isLoading,
  error,
  schoolYear,
  schoolYears,
  schoolYearId,
  onSchoolYearChange,
  onPeriodChange,
  onRetry,
  onAccountingDataChanged,
  onPaymentRecorded,
  onStructureSaved,
}) {
  const titles = {
    teachers: ['Enseignants', 'Consultez les enseignants et leurs affectations par classe et matière.'],
    secretariat: ['Secrétariat', 'Suivez les dossiers et les inscriptions des élèves.'],
    accounting: ['Comptabilité', 'Consultez les frais scolaires, encaissements et soldes à percevoir.'],
    parents: ['Parents', 'Consultez les parents et les élèves qui leur sont associés.'],
    classes: ['Classes & Matières', 'Consultez les classes, les matières et les affectations pédagogiques.'],
    statistics: ['Statistiques', 'Analysez les résultats scolaires par classe et par période.'],
  };
  const [title, description] = titles[section] ?? ['Rubrique', 'Gestion de l’établissement.'];

  return (
    <section className="director-management">
      <div className="director-page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}{schoolYear ? ` — Année ${schoolYear.label}` : ''}</p>
        </div>
        <div className="director-page-actions">
          {section !== 'parents' && (
            <label className="director-year-select">
              <span className="sr-only">Année scolaire</span>
              <select
                aria-label="Année scolaire"
                value={schoolYearId}
                onChange={(event) => onSchoolYearChange(event.target.value)}
              >
                {schoolYears.map((year) => <option value={year.id} key={year.id}>{year.label}</option>)}
              </select>
            </label>
          )}
          {section === 'secretariat' && <Link className="director-export-button" to="/students">Gérer les élèves</Link>}
        </div>
      </div>

      {error && (
        <div className="director-alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>Réessayer</button>
        </div>
      )}
      {isLoading && <p className="director-loading">Chargement des données…</p>}
      {!isLoading && section === 'accounting' && !schoolYearId && (
        <div className="director-empty-state">
          <Wallet size={28} aria-hidden="true" />
          <strong>Aucune année scolaire disponible</strong>
          <span>Créez d’abord une année scolaire avant de consulter les frais et les encaissements.</span>
          <Link to="/students">Accéder à la gestion des élèves</Link>
        </div>
      )}
      {!isLoading && data && section === 'teachers' && (
        <>
          <div className="director-summary-card"><strong>{data.teachers.length}</strong><span>enseignant(s) actif(s)</span></div>
          <div className="director-data-table-wrap">
            <table className="director-data-table">
              <thead><tr><th>Enseignant</th><th>Code</th><th>Spécialité</th><th>Classes et matières</th></tr></thead>
              <tbody>{data.teachers.map((teacher) => {
                const assignments = data.assignments.filter((item) => String(item.teacher?.id) === String(teacher.id));
                return (
                  <tr key={teacher.id}>
                    <td>{teacher.firstname} {teacher.lastname}</td>
                    <td>{teacher.teacher_registration_code}</td>
                    <td>{teacher.specialty || '—'}</td>
                    <td>{assignments.length
                      ? assignments.map((item) => `${item.class.name} · ${item.subject.name}`).join(', ')
                      : 'Aucune affectation'}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </>
      )}
      {!isLoading && data && section === 'secretariat' && (
        <div className="director-summary-card">
          <strong>{data.meta?.total ?? data.data?.length ?? 0}</strong>
          <span>élève(s) inscrit(s) pour cette année</span>
          <Link to="/students">Ouvrir la liste et les dossiers élèves →</Link>
        </div>
      )}
      {!isLoading && data && section === 'accounting' && (
        <>
          <TuitionFeeSetup
            schoolYearId={schoolYearId}
            classes={data.classes}
            fees={data.fees}
            onSaved={onAccountingDataChanged}
          />
          <RecordPaymentForm fees={data.fees} onSaved={onPaymentRecorded} canManageFees />
          <div className="director-module-metrics">
            <article className="director-summary-card"><strong>{displayAmount(data.overview.total_expected)} F</strong><span>Total attendu</span></article>
            <article className="director-summary-card"><strong>{displayAmount(data.overview.total_received)} F</strong><span>Total encaissé</span></article>
            <article className="director-summary-card"><strong>{displayAmount(data.overview.remaining_total)} F</strong><span>Reste à percevoir</span></article>
            <article className="director-summary-card"><strong>{data.overview.overdue_students_count}</strong><span>Élèves en retard</span></article>
          </div>
          <div className="director-data-table-wrap">
            <table className="director-data-table">
              <thead><tr><th>Reçu</th><th>Date</th><th>Élève</th><th>Classe</th><th>Montant</th><th>Mode</th><th>Document</th></tr></thead>
              <tbody>{(data.payments.data ?? data.payments).map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.receipt_number}</td>
                  <td>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('fr-FR') : '—'}</td>
                  <td>{payment.student?.first_name} {payment.student?.last_name}</td>
                  <td>{payment.installment?.tuition_fee?.class?.name ?? '—'}</td>
                  <td>{displayAmount(payment.amount)} F</td>
                  <td>{payment.payment_method}</td>
                  <td>
                    <PdfDownloadLink
                      url={`/payments/${payment.id}/receipt/pdf`}
                      className="director-document-link"
                      fallbackName={`recu-${payment.receipt_number}.pdf`}
                    >
                      Télécharger le reçu PDF
                    </PdfDownloadLink>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {data.payments.length === 0 && <p className="director-empty">Aucun paiement enregistré pour cette année scolaire.</p>}
            {data.fees.length === 0 && <p className="director-empty">Aucun frais scolaire configuré pour cette année.</p>}
          </div>
        </>
      )}
      {!isLoading && data && section === 'parents' && (
        <div className="director-data-table-wrap">
          <table className="director-data-table">
            <thead><tr><th>Parent / tuteur</th><th>Téléphone</th><th>Élève(s) associé(s)</th><th>Compte</th></tr></thead>
            <tbody>{data.map((parent) => (
              <tr key={parent.id}>
                <td>{parent.first_name} {parent.last_name}</td>
                <td>{parent.telephone || '—'}</td>
                <td>{parent.students?.map((student) => `${student.first_name} ${student.last_name}`).join(', ') || 'Aucun élève lié'}</td>
                <td>{parent.has_account ? 'Activé' : 'Non créé'}</td>
              </tr>
            ))}</tbody>
          </table>
          {data.length === 0 && <p className="director-empty">Aucun parent n’est encore enregistré.</p>}
        </div>
      )}
      {!isLoading && data && section === 'classes' && (
        <>
          <SchoolStructureManager
            schoolYearId={schoolYearId}
            classes={data.classes}
            subjects={data.subjects}
            teachers={data.teachers}
            onSaved={onStructureSaved}
          />
          <div className="director-module-metrics">
            <article className="director-summary-card"><strong>{data.classes.length}</strong><span>classe(s) pour cette année</span></article>
            <article className="director-summary-card"><strong>{data.subjects.length}</strong><span>matière(s) au catalogue</span></article>
            <article className="director-summary-card"><strong>{data.assignments.length}</strong><span>affectation(s) pédagogique(s)</span></article>
          </div>
          <div className="director-data-table-wrap">
            <h2 className="director-table-title">Classes</h2>
            <table className="director-data-table">
              <thead><tr><th>Classe</th><th>Niveau</th><th>Effectif</th><th>Capacité</th><th>Professeur titulaire</th></tr></thead>
              <tbody>{data.classes.map((schoolClass) => (
                <tr key={schoolClass.id}>
                  <td>{schoolClass.name}</td>
                  <td>{schoolClass.level}</td>
                  <td>{schoolClass.enrolled_students_count ?? '—'}</td>
                  <td>{schoolClass.capacity ?? '—'}</td>
                  <td>{schoolClass.titular_teacher
                    ? `${schoolClass.titular_teacher.firstname} ${schoolClass.titular_teacher.lastname}`
                    : 'Non attribué'}
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {data.classes.length === 0 && <p className="director-empty">Aucune classe n’est enregistrée pour cette année.</p>}
          </div>
          <div className="director-data-table-wrap">
            <h2 className="director-table-title">Matières</h2>
            <table className="director-data-table">
              <thead><tr><th>Matière</th><th>Coefficient</th></tr></thead>
              <tbody>{data.subjects.map((subject) => (
                <tr key={subject.id}><td>{subject.name}</td><td>{subject.coefficient}</td></tr>
              ))}</tbody>
            </table>
            {data.subjects.length === 0 && <p className="director-empty">Aucune matière n’est encore configurée.</p>}
          </div>
          <div className="director-data-table-wrap">
            <h2 className="director-table-title">Affectations pédagogiques</h2>
            <table className="director-data-table">
              <thead><tr><th>Enseignant</th><th>Classe</th><th>Matière</th><th>Coefficient</th></tr></thead>
              <tbody>{data.assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>{assignment.teacher.firstname} {assignment.teacher.lastname}</td>
                  <td>{assignment.class.name}</td>
                  <td>{assignment.subject.name}</td>
                  <td>{assignment.subject.coefficient}</td>
                </tr>
              ))}</tbody>
            </table>
            {data.assignments.length === 0 && <p className="director-empty">Aucune affectation pour cette année scolaire.</p>}
          </div>
        </>
      )}
      {!isLoading && data && section === 'statistics' && data.overview && (
        <>
          <div className="director-page-actions director-statistics-periods" role="group" aria-label="Période scolaire">
            {data.periods.map((period, index) => (
              <button
                className={`director-period-button${String(period.id) === String(data.overview.period?.id) ? ' active' : ''}`}
                key={period.id}
                type="button"
                onClick={() => onPeriodChange(String(period.id))}
              >
                {getPeriodShortLabel(period.label, index)}
              </button>
            ))}
          </div>
          <div className="director-module-metrics">
            <article className="director-summary-card"><strong>{data.overview.metrics.students_enrolled}</strong><span>élève(s) inscrit(s)</span></article>
            <article className="director-summary-card"><strong>{data.overview.metrics.classes_active}</strong><span>classe(s) active(s)</span></article>
            <article className="director-summary-card"><strong>{data.overview.class_averages.length}</strong><span>classe(s) évaluée(s)</span></article>
          </div>
          <div className="director-data-table-wrap">
            <h2 className="director-table-title">Résultats par classe · {data.overview.period?.label}</h2>
            <table className="director-data-table">
              <thead><tr><th>Classe</th><th>Niveau</th><th>Effectif</th><th>Élèves avec moyenne</th><th>Moyenne / 20</th><th>Mention</th></tr></thead>
              <tbody>{data.overview.class_averages.map((item) => (
                <tr key={item.class_id}>
                  <td>{item.class_name}</td>
                  <td>{item.level}</td>
                  <td>{item.students_count}</td>
                  <td>{item.students_with_average_count}</td>
                  <td>{item.average ?? '—'}</td>
                  <td>{getGradeMention(item.average)}</td>
                </tr>
              ))}</tbody>
            </table>
            {data.overview.class_averages.length === 0 && <p className="director-empty">Aucun résultat scolaire n’est disponible pour cette période.</p>}
          </div>
        </>
      )}
      {!isLoading && data && section === 'statistics' && !data.overview && (
        <p className="director-empty">Aucune période n’est configurée pour cette année scolaire.</p>
      )}
    </section>
  );
}