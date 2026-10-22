import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { formatAmount } from './roleDashboardUtils';

function initialInstallment(totalAmount) {
  return [{
    label: 'Tranche 1',
    amount: String(totalAmount),
    due_date: '',
  }];
}

function errorMessage(error) {
  const errors = error.response?.data?.errors;
  return errors
    ? Object.values(errors).flat().join(' ')
    : error.response?.data?.message || 'Impossible d’enregistrer les frais scolaires.';
}

export default function TuitionFeeSetup({
  schoolYearId,
  classes,
  fees,
  onSaved,
}) {
  const [classId, setClassId] = useState(String(classes[0]?.id ?? ''));
  const [totalAmount, setTotalAmount] = useState('');
  const [newInstallments, setNewInstallments] = useState([
    { label: 'Tranche 1', amount: '', due_date: '' },
  ]);
  const [feeId, setFeeId] = useState('');
  const [installments, setInstallments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const existingClassIds = new Set(fees.map((fee) => String(fee.class?.id)));
  const availableClasses = classes.filter((schoolClass) => !existingClassIds.has(String(schoolClass.id)));
  const selectedClassId = availableClasses.some((schoolClass) => String(schoolClass.id) === classId)
    ? classId
    : String(availableClasses[0]?.id ?? '');
  const currentFee = fees.find((fee) => String(fee.id) === feeId);
  const installmentTotal = installments.reduce((sum, installment) => sum + (Number(installment.amount) || 0), 0);
  const totalMatches = currentFee && Math.round(installmentTotal * 100) === Math.round(Number(currentFee.total_amount) * 100);
  const newInstallmentTotal = newInstallments.reduce(
    (sum, installment) => sum + (Number(installment.amount) || 0),
    0,
  );
  const newTotalMatches = totalAmount
    && Math.round(newInstallmentTotal * 100) === Math.round(Number(totalAmount) * 100);

  async function createFee(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      await api.post('/tuition-fees', {
        class_id: Number(selectedClassId),
        school_year_id: Number(schoolYearId),
        total_amount: totalAmount,
        installments: newInstallments,
      });
      setNewInstallments([{ label: 'Tranche 1', amount: '', due_date: '' }]);
      setTotalAmount('');
      setSuccess('La pension annuelle et ses tranches sont enregistrées pour cette classe. Elles s’appliquent à tous les élèves inscrits.');
      onSaved();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  function updateNewInstallment(index, field, value) {
    setNewInstallments((current) => current.map((item, currentIndex) => (
      currentIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function addNewInstallment() {
    if (newInstallments.length >= 12) return;
    const remaining = Math.max(0, Number(totalAmount) - newInstallmentTotal);
    setNewInstallments((current) => [
      ...current,
      {
        label: `Tranche ${current.length + 1}`,
        amount: String(remaining),
        due_date: '',
      },
    ]);
  }

  function startInstallmentSetup(fee) {
    setFeeId(String(fee.id));
    setInstallments(fee.installments?.length
      ? fee.installments.map((item) => ({
        label: item.label,
        amount: String(item.amount),
        due_date: item.due_date,
      }))
      : initialInstallment(fee.total_amount));
    setError('');
    setSuccess('');
  }

  function updateInstallment(index, field, value) {
    setInstallments((current) => current.map((item, currentIndex) => (
      currentIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function addInstallment() {
    if (installments.length >= 12) return;
    const remaining = Math.max(0, Number(currentFee?.total_amount) - installmentTotal);
    setInstallments((current) => [
      ...current,
      {
        label: `Tranche ${current.length + 1}`,
        amount: String(remaining),
        due_date: '',
      },
    ]);
  }

  async function saveInstallments(event) {
    event.preventDefault();
    if (!currentFee) return;
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      await api.put(`/tuition-fees/${currentFee.id}/installments`, { installments });
      setSuccess('Les échéances sont enregistrées. La comptabilité peut maintenant saisir les paiements.');
      setFeeId('');
      setInstallments([]);
      onSaved();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="tuition-setup-panel">
      <div className="tuition-setup-heading">
        <div>
          <h2>Définir la pension par classe</h2>
          <p>
            Pour chaque classe et année scolaire, définissez une seule fois le montant annuel et ses tranches.
            Ce même échéancier s’applique à tous les élèves inscrits dans la classe.
          </p>
        </div>
      </div>

      {!classes.length ? (
        <p className="tuition-setup-empty">
          Aucune classe n’est disponible pour cette année. Créez d’abord les classes et affectations dans{' '}
          <Link to="/dashboard/classes">Classes & Matières</Link>.
        </p>
      ) : availableClasses.length ? (
        <form className="tuition-create-form tuition-create-workflow" onSubmit={createFee}>
          <label>Classe
            <select value={selectedClassId} onChange={(event) => setClassId(event.target.value)} required>
              {availableClasses.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
              ))}
            </select>
          </label>
          <label>Frais annuels (FCFA)
            <input
              type="number"
              min="1"
              step="1"
              value={totalAmount}
              onChange={(event) => {
                const value = event.target.value;
                setTotalAmount(value);
                setNewInstallments((current) => current.length === 1
                  && (!current[0].amount || Number(current[0].amount) === Number(totalAmount))
                  ? [{ ...current[0], amount: value }]
                  : current);
              }}
              required
            />
          </label>
          <div className="tuition-create-installments">
            <div className="tuition-installment-heading">
              <h3>Tranches de paiement</h3>
              <span>Total à répartir : {formatAmount(totalAmount || 0)} FCFA</span>
            </div>
            {newInstallments.map((installment, index) => (
              <div className="tuition-installment-row" key={`new-installment-${index}`}>
                <label>Libellé
                  <input
                    value={installment.label}
                    onChange={(event) => updateNewInstallment(index, 'label', event.target.value)}
                    required
                  />
                </label>
                <label>Montant (FCFA)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={installment.amount}
                    onChange={(event) => updateNewInstallment(index, 'amount', event.target.value)}
                    required
                  />
                </label>
                <label>Date limite
                  <input
                    type="date"
                    value={installment.due_date}
                    onChange={(event) => updateNewInstallment(index, 'due_date', event.target.value)}
                    required
                  />
                </label>
                {newInstallments.length > 1 && (
                  <button
                    className="tuition-remove-installment"
                    type="button"
                    onClick={() => setNewInstallments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    Retirer
                  </button>
                )}
              </div>
            ))}
            <div className="tuition-installment-footer">
              <span className={newTotalMatches ? 'matches' : 'does-not-match'}>
                Réparti : {formatAmount(newInstallmentTotal)} FCFA
                {!newTotalMatches && ' · le total doit correspondre aux frais annuels'}
              </span>
              <div>
                <button type="button" onClick={addNewInstallment} disabled={newInstallments.length >= 12}>
                  Ajouter une tranche
                </button>
                <button type="submit" disabled={isSaving || !schoolYearId || !newTotalMatches}>
                  {isSaving ? 'Enregistrement…' : 'Enregistrer la pension et les tranches'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <p className="tuition-setup-empty">Les frais annuels sont déjà définis pour toutes les classes de cette année.</p>
      )}

      {fees.length > 0 && (
        <div className="tuition-fee-list">
          {fees.map((fee) => (
            <article className="tuition-fee-row" key={fee.id}>
              <div>
                <strong>{fee.class?.name ?? 'Classe'}</strong>
                <span>{formatAmount(fee.total_amount)} FCFA · {fee.installments?.length ?? 0} échéance(s)</span>
              </div>
              <button type="button" onClick={() => startInstallmentSetup(fee)}>
                {fee.installments?.length ? 'Modifier les échéances' : 'Configurer les échéances'}
              </button>
            </article>
          ))}
        </div>
      )}

      {currentFee && (
        <form className="tuition-installment-form" onSubmit={saveInstallments}>
          <div className="tuition-installment-heading">
            <h3>Échéances · {currentFee.class?.name}</h3>
            <span>Total à répartir : {formatAmount(currentFee.total_amount)} FCFA</span>
          </div>
          {installments.map((installment, index) => (
            <div className="tuition-installment-row" key={`${feeId}-${index}`}>
              <label>Libellé
                <input
                  value={installment.label}
                  onChange={(event) => updateInstallment(index, 'label', event.target.value)}
                  required
                />
              </label>
              <label>Montant (FCFA)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={installment.amount}
                  onChange={(event) => updateInstallment(index, 'amount', event.target.value)}
                  required
                />
              </label>
              <label>Date limite
                <input
                  type="date"
                  value={installment.due_date}
                  onChange={(event) => updateInstallment(index, 'due_date', event.target.value)}
                  required
                />
              </label>
              {installments.length > 1 && (
                <button
                  className="tuition-remove-installment"
                  type="button"
                  onClick={() => setInstallments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
          <div className="tuition-installment-footer">
            <span className={totalMatches ? 'matches' : 'does-not-match'}>
              Réparti : {formatAmount(installmentTotal)} FCFA
              {!totalMatches && ' · le total doit correspondre aux frais annuels'}
            </span>
            <div>
              <button type="button" onClick={addInstallment} disabled={installments.length >= 12}>
                Ajouter une tranche
              </button>
              <button type="button" className="tuition-cancel-button" onClick={() => setFeeId('')}>
                Annuler
              </button>
              <button type="submit" disabled={isSaving || !totalMatches}>
                {isSaving ? 'Enregistrement…' : 'Enregistrer les échéances'}
              </button>
            </div>
          </div>
        </form>
      )}

      {error && <p className="school-structure-error" role="alert">{error}</p>}
      {success && <p className="role-dashboard-success" role="status">{success}</p>}
    </section>
  );
}
