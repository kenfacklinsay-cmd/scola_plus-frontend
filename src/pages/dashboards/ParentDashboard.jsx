import { useEffect, useState } from 'react';
import { BookOpen, FileDown, Wallet } from 'lucide-react';
import api from '../../api/axios';
import PdfDownloadLink from '../../components/PdfDownloadLink';
import PrintDocumentLink from '../../components/PrintDocumentLink';
import RoleDashboardLayout from './RoleDashboardLayout';
import {
  formatAmount,
  getRequestError,
  getResponseData,
  useRoleErrorNavigation,
} from './roleDashboardUtils';

const parentTabs = [
  { id: 'grades', label: 'Notes', icon: BookOpen },
  { id: 'bulletins', label: 'Bulletins', icon: FileDown },
  { id: 'payments', label: 'Paiements', icon: Wallet },
];

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

export default function ParentDashboard({ user }) {
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState('');
  const [schoolYearId, setSchoolYearId] = useState('');
  const [balances, setBalances] = useState({});
  const [academicData, setAcademicData] = useState(null);
  const [activeTab, setActiveTab] = useState('grades');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAcademics, setIsLoadingAcademics] = useState(false);
  const [error, setError] = useState('');
  const [academicError, setAcademicError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const handleRequestError = useRoleErrorNavigation();

  useEffect(() => {
    let isCurrent = true;

    async function loadChildren() {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/parent/children');
        const items = getResponseData(response);
        if (!isCurrent) return;
        setChildren(items);
        setActiveChildId((current) => current || String(items[0]?.id ?? ''));

        const balanceResults = await Promise.all(items.map(async (child) => {
          const balanceResponse = await api.get(`/parent/children/${child.id}/tuition`);
          return [child.id, getResponseData(balanceResponse)];
        }));
        if (isCurrent) setBalances(Object.fromEntries(balanceResults));
      } catch (requestError) {
        if (!isCurrent) return;
        if (!handleRequestError(requestError)) setError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadChildren();
    return () => { isCurrent = false; };
  }, [handleRequestError, reloadKey]);

  useEffect(() => {
    if (activeTab !== 'notifications') return undefined;
    let isCurrent = true;

    async function loadNotifications() {
      setIsLoadingNotifications(true);
      setNotificationError('');
      try {
        const response = await api.get('/parent/notifications');
        if (!isCurrent) return;
        setNotifications(getResponseData(response));
        setUnreadNotificationCount(response.data.unread_count ?? 0);
      } catch (requestError) {
        if (!isCurrent) return;
        if (!handleRequestError(requestError)) setNotificationError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoadingNotifications(false);
      }
    }

    loadNotifications();
    return () => { isCurrent = false; };
  }, [activeTab, handleRequestError, reloadKey]);

  const activeChild = children.find((child) => String(child.id) === activeChildId) ?? children[0];
  const enrollments = activeChild?.enrollments ?? [];
  const selectedEnrollment = enrollments.find(
    (enrollment) => String(enrollment.school_year.id) === schoolYearId,
  ) ?? enrollments[0];
  const availablePeriods = selectedEnrollment?.periods ?? [];
  const [periodId, setPeriodId] = useState('');
  const selectedPeriod = availablePeriods.find((period) => String(period.id) === periodId)
    ?? selectedEnrollment?.period
    ?? availablePeriods.at(-1);
  const childFinance = activeChild ? balances[activeChild.id] : null;
  const selectedBalance = childFinance?.balances?.find(
    (balance) => String(balance.school_year_id) === String(selectedEnrollment?.school_year.id),
  );
  const childPayments = (childFinance?.payments ?? []).filter(
    (payment) => String(payment.school_year_id) === String(selectedEnrollment?.school_year.id),
  );
  const paidPercentage = selectedBalance && Number(selectedBalance.net_total) > 0
    ? Math.min(100, Math.round((Number(selectedBalance.paid_total) / Number(selectedBalance.net_total)) * 100))
    : 0;

  useEffect(() => {
    if (!activeChild || !selectedPeriod) {
      return undefined;
    }

    let isCurrent = true;

    async function loadAcademicData() {
      setIsLoadingAcademics(true);
      setAcademicError('');
      try {
        const response = await api.get(
          `/parent/children/${activeChild.id}/periods/${selectedPeriod.id}`,
        );
        if (isCurrent) setAcademicData(getResponseData(response));
      } catch (requestError) {
        if (!isCurrent) return;
        if (!handleRequestError(requestError)) setAcademicError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoadingAcademics(false);
      }
    }

    loadAcademicData();
    return () => { isCurrent = false; };
  }, [activeChild, handleRequestError, selectedPeriod]);

  function selectChild(child) {
    setActiveChildId(String(child.id));
    setSchoolYearId(String(child.enrollments?.[0]?.school_year?.id ?? ''));
    setPeriodId('');
    setAcademicData(null);
  }

  async function markNotificationRead(notificationId) {
    setNotificationError('');
    try {
      await api.patch(`/parent/notifications/${encodeURIComponent(notificationId)}/read`);
      setNotifications((current) => current.map((notification) => (
        notification.id === notificationId
          ? { ...notification, read_at: new Date().toISOString() }
          : notification
      )));
      setUnreadNotificationCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      if (!handleRequestError(requestError)) setNotificationError(getRequestError(requestError));
    }
  }

  const title = activeChild
    ? `Espace parent · ${activeChild.first_name} ${activeChild.last_name}`
    : 'Espace parent';

  return (
    <RoleDashboardLayout
      user={user}
      title={title}
      description="Consultez les résultats scolaires, bulletins et paiements de vos enfants."
      isLoading={isLoading}
      error={error}
      onRetry={() => setReloadKey((key) => key + 1)}
      activeNavigation={activeTab === 'payments'
        ? 'finance'
        : activeTab === 'notifications' ? 'notifications' : 'children'}
      onNavigationChange={(section) => {
        if (section === 'finance') setActiveTab('payments');
        else if (section === 'notifications') setActiveTab('notifications');
        else setActiveTab('grades');
      }}
    >
      {!children.length ? (
        <section className="role-dashboard-panel">
          <p className="role-dashboard-state">Aucun élève n’est encore associé à ce compte parent.</p>
        </section>
      ) : (
        <>
          <div className="parent-children-heading">
            <h2>Mes enfants <span>{children.length}</span></h2>
            <p>Sélectionnez un enfant pour consulter ses résultats et sa situation scolaire.</p>
          </div>
          <div className="parent-child-selector" aria-label="Choisir un enfant">
            {children.map((child) => {
              const latestEnrollment = child.enrollments?.[0];
              const isSelected = String(child.id) === String(activeChild?.id);

              return (
                <button
                  className={`parent-child-chip${isSelected ? ' active' : ''}`}
                  key={child.id}
                  type="button"
                  onClick={() => selectChild(child)}
                  aria-pressed={isSelected}
                >
                  <span className="parent-child-chip-avatar" aria-hidden="true">
                    {[child.first_name?.[0], child.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'É'}
                  </span>
                  <span>
                    <strong>{child.first_name} {child.last_name}</strong>
                    <small>
                      {latestEnrollment?.class?.name ?? 'Classe non définie'}
                      {latestEnrollment?.average !== null && latestEnrollment?.average !== undefined
                        ? ` · Moy. ${Number(latestEnrollment.average).toFixed(1)}`
                        : ''}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="parent-overview-toolbar">
            <label>Année scolaire
              <select
                value={selectedEnrollment?.school_year.id ?? ''}
                onChange={(event) => {
                  setSchoolYearId(event.target.value);
                  setPeriodId('');
                  setAcademicData(null);
                }}
              >
                {enrollments.map((enrollment) => (
                  <option key={enrollment.school_year.id} value={enrollment.school_year.id}>
                    {enrollment.school_year.label}
                  </option>
                ))}
              </select>
            </label>
            {availablePeriods.length > 0 && (
              <label>Période
                <select
                  value={selectedPeriod?.id ?? ''}
                  onChange={(event) => setPeriodId(event.target.value)}
                >
                  {availablePeriods.map((period) => (
                    <option key={period.id} value={period.id}>{period.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="parent-overview-cards">
            <article className="parent-overview-card">
              <span>Moyenne générale</span>
              <strong>
                {academicData?.average === null || academicData?.average === undefined
                  ? '—'
                  : Number(academicData.average).toFixed(1)}
              </strong>
              <small>/20 · {selectedPeriod?.label ?? 'Période non configurée'}</small>
              {academicData?.mention && <em>{academicData.mention}</em>}
            </article>
            <article className="parent-overview-card">
              <span>Rang dans la classe</span>
              <strong>{academicData?.rank ? `${academicData.rank}${academicData.rank === 1 ? 'er' : 'e'}` : '—'}</strong>
              <small>
                {academicData?.class?.name ?? selectedEnrollment?.class?.name ?? 'Classe'}
                {academicData?.class_size ? ` · sur ${academicData.class_size}` : ''}
              </small>
            </article>
            <article className="parent-overview-card parent-overview-finance">
              <span>Situation financière</span>
              <strong>{formatAmount(selectedBalance?.paid_total ?? 0)} F</strong>
              <div className="parent-payment-progress" aria-label={`${paidPercentage}% payé`}>
                <span style={{ width: `${paidPercentage}%` }} />
              </div>
              <small>{paidPercentage}% payé · reste {formatAmount(selectedBalance?.remaining_total ?? 0)} F</small>
            </article>
          </div>

          <nav className="parent-content-tabs" aria-label="Éléments de l’enfant">
            {parentTabs.map(({ id, label, icon: Icon }) => (
              <button
                className={activeTab === id ? 'active' : ''}
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-pressed={activeTab === id}
              >
                <Icon size={16} aria-hidden="true" /> {label}
              </button>
            ))}
          </nav>

          {activeTab === 'grades' && (
            <section className="role-dashboard-panel parent-data-panel">
              <div className="parent-data-heading">
                <div>
                  <h2>Notes de {activeChild.first_name} {activeChild.last_name} — {selectedPeriod?.label ?? 'Période'}</h2>
                  <p>{selectedEnrollment?.class?.name} · Année {selectedEnrollment?.school_year?.label}</p>
                </div>
              </div>
              {isLoadingAcademics ? (
                <p className="role-dashboard-state">Chargement des notes…</p>
              ) : academicError ? (
                <p className="role-dashboard-error" role="alert">{academicError}</p>
              ) : academicData?.subjects?.length ? (
                <div className="role-dashboard-table-wrap">
                  <table className="role-dashboard-table parent-grades-table">
                    <thead><tr><th>Matière</th><th>Coeff.</th><th>Évaluations</th><th>Moy. matière</th><th>Enseignant</th></tr></thead>
                    <tbody>{academicData.subjects.map((subject) => (
                      <tr key={subject.name}>
                        <td>{subject.name}</td>
                        <td>{subject.coefficient}</td>
                        <td>
                          {subject.assessments?.length
                            ? subject.assessments.map((assessment) => (
                              <span className="parent-grade-pill" key={`${subject.name}-${assessment.label}`}>
                                {assessment.label} : {assessment.value === null ? '—' : `${Number(assessment.value).toFixed(1)}/20`}
                              </span>
                            ))
                            : 'Aucune note saisie'}
                        </td>
                        <td className="parent-grade-average">
                          {subject.average === null ? '—' : `${Number(subject.average).toFixed(1)}/20`}
                        </td>
                        <td>{subject.teacher || '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : (
                <p className="role-dashboard-state">
                  {selectedPeriod
                    ? 'Aucune note n’est encore disponible pour cette période.'
                    : 'Aucune période scolaire n’est configurée pour cette année.'}
                </p>
              )}
            </section>
          )}

          {activeTab === 'bulletins' && (
            <section className="role-dashboard-panel parent-data-panel">
              <div className="parent-data-heading">
                <div>
                  <h2>Bulletins de {activeChild.first_name} {activeChild.last_name}</h2>
                  <p>Sélectionnez un bulletin pour le télécharger ou l’imprimer.</p>
                </div>
              </div>
              {availablePeriods.length ? (
                <div className="parent-bulletin-list">
                  {availablePeriods.map((period) => (
                    <article className="parent-bulletin-row" key={period.id}>
                      <div>
                        <strong>{period.label}</strong>
                        <span>{selectedEnrollment.class.name} · {selectedEnrollment.school_year.label}</span>
                      </div>
                      <div>
                        <PdfDownloadLink
                          url={`/students/${activeChild.id}/periods/${period.id}/bulletin/pdf`}
                          className="role-dashboard-document-link"
                          fallbackName={`bulletin-${activeChild.matricule}-${period.label}.pdf`}
                        >
                          <FileDown size={15} /> PDF
                        </PdfDownloadLink>
                        <PrintDocumentLink
                          url={`/students/${activeChild.id}/periods/${period.id}/bulletin/print`}
                          className="role-dashboard-document-link"
                        >
                          Imprimer
                        </PrintDocumentLink>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="role-dashboard-state">Aucun bulletin disponible : les périodes de cette année ne sont pas configurées.</p>}
            </section>
          )}

          {activeTab === 'payments' && (
            <section className="role-dashboard-panel parent-data-panel">
              <div className="parent-data-heading">
                <div>
                  <h2>Paiements de {activeChild.first_name} {activeChild.last_name}</h2>
                  <p>{selectedEnrollment?.class?.name} · Année {selectedEnrollment?.school_year?.label}</p>
                </div>
              </div>
              {childPayments.length ? (
                <div className="role-dashboard-table-wrap">
                  <table className="role-dashboard-table">
                    <thead><tr><th>Reçu</th><th>Date</th><th>Tranche</th><th>Montant</th><th>Mode</th><th>Document</th></tr></thead>
                    <tbody>{childPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.receipt_number}</td>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>{payment.installment}</td>
                        <td>{formatAmount(payment.amount)} F</td>
                        <td>{payment.payment_method}</td>
                        <td>
                          <PdfDownloadLink
                            url={`/parent/payments/${payment.id}/receipt/pdf`}
                            className="role-dashboard-document-link"
                            fallbackName={`recu-${payment.receipt_number}.pdf`}
                          >
                            <FileDown size={15} /> Reçu PDF
                          </PdfDownloadLink>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : (
                <p className="role-dashboard-state">Aucun paiement enregistré pour cette année scolaire.</p>
              )}
            </section>
          )}

          {activeTab === 'notifications' && (
            <section className="role-dashboard-panel parent-data-panel">
              <div className="parent-data-heading">
                <div>
                  <h2>Notifications</h2>
                  <p>
                    {unreadNotificationCount
                      ? `${unreadNotificationCount} notification(s) non lue(s)`
                      : 'Vous êtes à jour.'}
                  </p>
                </div>
              </div>
              {notificationError && <div className="role-dashboard-error" role="alert">{notificationError}</div>}
              {isLoadingNotifications ? (
                <p className="role-dashboard-state">Chargement des notifications…</p>
              ) : notifications.length ? (
                <div className="parent-notification-list">
                  {notifications.map((notification) => (
                    <article
                      className={`parent-notification-item${notification.read_at ? '' : ' unread'}`}
                      key={notification.id}
                    >
                      <div>
                        <h3>{notification.data.title}</h3>
                        <p>{notification.data.message}</p>
                        <small>
                          {notification.data.class_name} · {formatDate(notification.data.attendance_date)}
                        </small>
                      </div>
                      {!notification.read_at && (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          Marquer comme lue
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="role-dashboard-state">Aucune notification pour le moment.</p>
              )}
            </section>
          )}
        </>
      )}
    </RoleDashboardLayout>
  );
}
