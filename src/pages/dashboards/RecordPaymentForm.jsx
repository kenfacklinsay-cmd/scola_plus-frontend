import { useEffect, useState } from 'react';
import { FileDown, Search } from 'lucide-react';
import api from '../../api/axios';
import PdfDownloadLink from '../../components/PdfDownloadLink';
import { formatAmount, getRequestError, getResponseData, useRoleErrorNavigation } from './roleDashboardUtils';

function todayLocal() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

function getValidationError(error) {
  const errors = error.response?.data?.errors;
  return errors
    ? Object.values(errors).flat().join(' ')
    : getRequestError(error);
}

export default function RecordPaymentForm({ fees, onSaved, canManageFees = false }) {
  const [feeId, setFeeId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [balance, setBalance] = useState(null);
  const [installmentId, setInstallmentId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayLocal);
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedPayment, setSavedPayment] = useState(null);
  const handleRequestError = useRoleErrorNavigation();
  const selectedFee = fees.find((fee) => String(fee.id) === feeId) ?? fees[0];
  const selectedStudent = students.find((student) => String(student.id) === studentId);
  const selectedInstallment = balance?.installments.find((item) => String(item.id) === installmentId);
  const eligibleInstallments = balance?.installments.filter((item) => Number(item.remaining_amount) > 0) ?? [];
  const hasInstallmentSchedule = Boolean(balance?.installments.length);

  useEffect(() => {
    if (!selectedFee) return undefined;
    let isCurrent = true;
    const timeout = window.setTimeout(async () => {
      setIsLoadingStudents(true);
      setError('');
      try {
        const response = await api.get(`/tuition-fees/${selectedFee.id}/students`, {
          params: { search: studentSearch.trim() || undefined },
        });
        if (isCurrent) setStudents(getResponseData(response));
      } catch (requestError) {
        if (isCurrent && !handleRequestError(requestError)) setError(getValidationError(requestError));
      } finally {
        if (isCurrent) setIsLoadingStudents(false);
      }
    }, studentSearch.trim() ? 250 : 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [handleRequestError, selectedFee, studentSearch]);

  useEffect(() => {
    if (!selectedFee || !studentId) return undefined;
    let isCurrent = true;

    async function loadBalance() {
      setIsLoadingBalance(true);
      setBalance(null);
      setInstallmentId('');
      setAmount('');
      setError('');
      try {
        const response = await api.get(
          `/tuition-fees/${selectedFee.id}/students/${studentId}/balance`,
        );
        if (!isCurrent) return;
        const studentBalance = getResponseData(response);
        const nextInstallment = studentBalance.installments.find(
          (item) => Number(item.remaining_amount) > 0,
        );
        setBalance(studentBalance);
        setInstallmentId(String(nextInstallment?.id ?? ''));
        setAmount(nextInstallment?.remaining_amount ?? '');
      } catch (requestError) {
        if (isCurrent && !handleRequestError(requestError)) setError(getValidationError(requestError));
      } finally {
        if (isCurrent) setIsLoadingBalance(false);
      }
    }

    loadBalance();
    return () => {
      isCurrent = false;
    };
  }, [handleRequestError, selectedFee, studentId]);

  function selectFee(value) {
    setFeeId(value);
    setStudentId('');
    setStudentSearch('');
    setStudents([]);
    setBalance(null);
    setInstallmentId('');
    setAmount('');
    setSavedPayment(null);
    setError('');
  }

  async function submitPayment(event) {
    event.preventDefault();
    if (!selectedFee || !studentId || !installmentId) return;
    setIsSaving(true);
    setError('');
    setSavedPayment(null);

    try {
      const response = await api.post('/payments', {
        student_id: Number(studentId),
        installment_id: Number(installmentId),
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
      });
      const payment = getResponseData(response);
      setSavedPayment(payment);
      setStudentId('');
      setBalance(null);
      setInstallmentId('');
      setAmount('');
      setStudentSearch('');
      onSaved?.(payment);
    } catch (requestError) {
      if (!handleRequestError(requestError)) setError(getValidationError(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="role-dashboard-panel record-payment-panel">
      <div className="record-payment-heading">
        <div>
          <h2>Enregistrer un paiement reçu</h2>
          <p>À utiliser après réception effective de l’argent à l’école.</p>
        </div>
      </div>

      {savedPayment && (
        <div className="role-dashboard-success" role="status">
          Paiement enregistré · Reçu {savedPayment.receipt_number}.
          <PdfDownloadLink
            url={`/payments/${savedPayment.id}/receipt/pdf`}
            className="record-payment-receipt"
            fallbackName={`recu-${savedPayment.receipt_number}.pdf`}
          >
            <FileDown size={16} /> Télécharger le reçu PDF
          </PdfDownloadLink>
        </div>
      )}

      {error && <p className="record-payment-error" role="alert">{error}</p>}

      {fees.length ? (
        <form className="record-payment-form" onSubmit={submitPayment}>
          <label>1. Classe et année
            <select
              value={selectedFee ? String(selectedFee.id) : ''}
              onChange={(event) => selectFee(event.target.value)}
              required
            >
              {fees.map((fee) => (
                <option key={fee.id} value={fee.id}>
                  {fee.class?.name ?? 'Classe'} · {fee.school_year?.label ?? ''}
                </option>
              ))}
            </select>
          </label>

          <label className="record-payment-student-search">2. Rechercher l’élève
            <span className="record-payment-search-field">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={studentSearch}
                onChange={(event) => {
                  setStudentSearch(event.target.value);
                  setStudentId('');
                  setBalance(null);
                  setInstallmentId('');
                  setAmount('');
                }}
                placeholder="Nom, prénom ou matricule"
                aria-label="Rechercher l’élève par nom ou matricule"
              />
            </span>
          </label>

          <label>Élève
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              disabled={isLoadingStudents || students.length === 0}
              required
            >
              <option value="">
                {isLoadingStudents ? 'Recherche…' : students.length ? 'Choisir un élève' : 'Aucun élève trouvé'}
              </option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.last_name} {student.first_name} · {student.matricule}
                </option>
              ))}
            </select>
          </label>

          {isLoadingBalance && <p className="record-payment-hint">Vérification du solde…</p>}
          {selectedStudent && balance && (
            <div className="record-payment-balance">
              <span>Reste à payer de {selectedStudent.first_name}</span>
              <strong>{formatAmount(balance.remaining_total)} F</strong>
            </div>
          )}

          <label>3. Tranche à régler
            <select
              value={installmentId}
              onChange={(event) => {
                const installment = eligibleInstallments.find((item) => String(item.id) === event.target.value);
                setInstallmentId(event.target.value);
                setAmount(installment?.remaining_amount ?? '');
              }}
              disabled={!eligibleInstallments.length || isLoadingBalance}
              required
            >
              {eligibleInstallments.length ? (
                eligibleInstallments.map((installment) => (
                  <option key={installment.id} value={installment.id}>
                    {installment.label} · reste {formatAmount(installment.remaining_amount)} F
                  </option>
                ))
              ) : (
                <option value="">
                  {balance && !hasInstallmentSchedule
                    ? 'Aucun échéancier configuré'
                    : balance
                      ? 'Toutes les tranches sont réglées'
                      : 'Sélectionner un élève d’abord'}
                </option>
              )}
            </select>
          </label>

          {balance && !hasInstallmentSchedule && (
            <p className="record-payment-hint" role="status">
              {canManageFees
                ? 'Aucun échéancier n’est défini. Définissez une seule fois la pension annuelle et ses tranches pour cette classe avant d’enregistrer un paiement.'
                : 'Le Directeur doit définir la pension annuelle et ses tranches pour cette classe avant de pouvoir enregistrer un paiement.'}
            </p>
          )}
          {balance && hasInstallmentSchedule && !eligibleInstallments.length && (
            <p className="record-payment-hint" role="status">
              Le solde de cet élève est déjà réglé. Pour réimprimer un reçu, retrouvez le paiement dans la liste des derniers paiements.
            </p>
          )}

          <label>4. Montant reçu (FCFA)
            <input
              type="number"
              min="1"
              max={selectedInstallment?.remaining_amount}
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              disabled={!selectedInstallment}
            />
            {selectedInstallment && (
              <small>Maximum pour cette tranche : {formatAmount(selectedInstallment.remaining_amount)} F</small>
            )}
          </label>

          <label>Date du paiement
            <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
          </label>

          <label>Moyen de paiement
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} required>
              <option value="Espèces">Espèces</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Virement bancaire">Virement bancaire</option>
              <option value="Chèque">Chèque</option>
              <option value="Autre">Autre</option>
            </select>
          </label>

          <button
            className="role-dashboard-action record-payment-submit"
            type="submit"
            disabled={isSaving || isLoadingBalance || !selectedInstallment}
          >
            {isSaving ? 'Enregistrement…' : 'Enregistrer et créer le reçu'}
          </button>
        </form>
      ) : (
        <p className="role-dashboard-state">
          Aucun frais scolaire n’est configuré pour cette année. Le Directeur doit définir les frais et les tranches avant l’encaissement.
        </p>
      )}
    </section>
  );
}
