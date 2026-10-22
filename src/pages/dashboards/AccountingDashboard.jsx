import { useEffect, useState } from 'react';
import api from '../../api/axios';
import PdfDownloadLink from '../../components/PdfDownloadLink';
import RoleDashboardLayout from './RoleDashboardLayout';
import RecordPaymentForm from './RecordPaymentForm';
import {
  formatAmount,
  getRequestError,
  getResponseData,
  useRoleErrorNavigation,
} from './roleDashboardUtils';

export default function AccountingDashboard({ user }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [schoolYears, setSchoolYears] = useState([]);
  const [schoolYearId, setSchoolYearId] = useState('');
  const [finance, setFinance] = useState(null);
  const [payments, setPayments] = useState([]);
  const [fees, setFees] = useState([]);
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

    async function loadAccounting() {
      setError('');
      try {
        const [overviewResponse, paymentsResponse, feesResponse] = await Promise.all([
          api.get('/finance/overview', { params: { school_year_id: schoolYearId } }),
          api.get('/payments', { params: { school_year_id: schoolYearId } }),
          api.get('/tuition-fees', { params: { school_year_id: schoolYearId } }),
        ]);
        if (!isCurrent) return;
        setFinance(getResponseData(overviewResponse));
        setPayments(paymentsResponse.data.data ?? []);
        setFees(feesResponse.data.data ?? []);
      } catch (requestError) {
        if (!isCurrent) return;
        if (!handleRequestError(requestError)) setError(getRequestError(requestError));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadAccounting();
    return () => { isCurrent = false; };
  }, [handleRequestError, reloadKey, schoolYearId]);

  return (
    <RoleDashboardLayout
      user={user}
      title="Espace comptabilité"
      description="Suivi des frais scolaires, encaissements et retards de paiement."
      isLoading={isLoading}
      error={error}
      onRetry={() => setReloadKey((key) => key + 1)}
      activeNavigation={activeSection}
      onNavigationChange={setActiveSection}
    >
      <div className="role-dashboard-toolbar">
        <label>Année scolaire
          <select value={schoolYearId} onChange={(event) => setSchoolYearId(event.target.value)}>
            {schoolYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}
          </select>
        </label>
      </div>
      {activeSection === 'overview' && finance ? (
        <>
          <div className="role-dashboard-metrics">
            <article className="role-dashboard-card"><strong>{formatAmount(finance.total_expected)} F</strong><span>Total attendu</span></article>
            <article className="role-dashboard-card"><strong>{formatAmount(finance.total_received)} F</strong><span>Encaissé</span></article>
            <article className="role-dashboard-card"><strong>{formatAmount(finance.remaining_total)} F</strong><span>Reste à percevoir</span></article>
            <article className="role-dashboard-card"><strong>{finance.overdue_students_count}</strong><span>Élèves en retard</span></article>
          </div>
          <section className="role-dashboard-panel accounting-payment-cta">
            <div>
              <h2>Un parent vient de régler la pension ?</h2>
              <p>Le paiement s’enregistre au guichet de l’école par la Comptabilité, après réception de l’argent.</p>
            </div>
            <button className="role-dashboard-action" type="button" onClick={() => setActiveSection('payments')}>
              Enregistrer un paiement
            </button>
          </section>
        </>
      ) : activeSection === 'overview' ? <p className="role-dashboard-state">Aucune année scolaire configurée.</p> : null}
      {activeSection === 'payments' && (
        <RecordPaymentForm
          fees={fees}
          onSaved={() => setReloadKey((key) => key + 1)}
        />
      )}
      {activeSection === 'payments' && (
        <section className="role-dashboard-panel">
          <h2>Derniers paiements</h2>
          {payments.length ? (
            <div className="role-dashboard-table-wrap">
              <table className="role-dashboard-table">
                <thead><tr><th>Reçu</th><th>Date</th><th>Élève</th><th>Classe</th><th>Montant</th><th>Document</th></tr></thead>
                <tbody>{payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.receipt_number}</td>
                    <td>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{payment.student?.first_name} {payment.student?.last_name}</td>
                    <td>{payment.installment?.tuition_fee?.class?.name ?? '—'}</td>
                    <td>{formatAmount(payment.amount)} F</td>
                    <td>
                      <PdfDownloadLink
                        url={`/payments/${payment.id}/receipt/pdf`}
                        className="role-dashboard-document-link"
                        fallbackName={`recu-${payment.receipt_number}.pdf`}
                      >
                        Reçu PDF
                      </PdfDownloadLink>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="role-dashboard-state">Aucun paiement enregistré pour cette année.</p>}
        </section>
      )}
      {activeSection === 'fees' && (
        <section className="role-dashboard-panel">
          <h2>Frais par classe</h2>
          {fees.length ? (
            <div className="role-dashboard-table-wrap">
              <table className="role-dashboard-table">
                <thead><tr><th>Classe</th><th>Total annuel</th><th>Échéances</th></tr></thead>
                <tbody>{fees.map((fee) => (
                  <tr key={fee.id}>
                    <td>{fee.class?.name ?? '—'}</td>
                    <td>{formatAmount(fee.total_amount)} F</td>
                    <td>{fee.installments?.length ?? 0}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="role-dashboard-state">Aucun frais scolaire configuré pour cette année.</p>}
        </section>
      )}
    </RoleDashboardLayout>
  );
}
