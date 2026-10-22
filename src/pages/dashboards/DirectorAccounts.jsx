import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import RoleDashboardLayout from './RoleDashboardLayout';

const initialForm = {
  firstname: '',
  lastname: '',
  email: '',
  telephone: '',
  teacher_registration_code: '',
  specialty: '',
  role: 'SECRETARIAT',
  initial_password: '',
  initial_password_confirmation: '',
};

function resourceData(response) {
  return response.data?.data ?? response.data;
}

function requestErrorMessage(error) {
  const errors = error.response?.data?.errors;
  return errors
    ? Object.values(errors).flat().join(' ')
    : error.response?.data?.message || 'Impossible de créer le compte. Vérifiez les informations saisies.';
}

export default function DirectorAccounts({ user, currentUserId, isStandalone = false }) {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('SECRETARIAT');
  const [form, setForm] = useState(initialForm);
  const [parents, setParents] = useState([]);
  const [parentId, setParentId] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordResetError, setPasswordResetError] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAccountId, setPendingAccountId] = useState('');
  const [pendingPasswordResetId, setPendingPasswordResetId] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function loadAccountOptions() {
      setLoadError('');
      try {
        const [parentsResponse, teachersResponse, accountsResponse] = await Promise.all([
          api.get('/parents'),
          api.get('/teachers'),
          api.get('/accounts'),
        ]);
        if (!isCurrent) return;
        setParents(resourceData(parentsResponse));
        setTeachers(resourceData(teachersResponse));
        setAccounts(resourceData(accountsResponse));
      } catch (error) {
        if (!isCurrent) return;
        if (error.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setLoadError(error.response?.data?.message || 'Impossible de charger les parents et les enseignants.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadAccountOptions();
    return () => { isCurrent = false; };
  }, [navigate]);

  const availableParents = parents.filter((parent) => !parent.has_account);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setSuccess('');
    setIsSaving(true);

    try {
      if (accountType === 'PARENT') {
        if (!parentId) {
          setFormError('Sélectionnez le parent à associer au compte.');
          return;
        }
        await api.post(`/parents/${parentId}/account`, {
          email: form.email.trim(),
          initial_password: form.initial_password,
          initial_password_confirmation: form.initial_password_confirmation,
        });
        setParents((current) => current.map((parent) => (
          String(parent.id) === parentId ? { ...parent, has_account: true } : parent
        )));
        setSuccess('Le compte parent a été créé. Le parent devra changer son mot de passe lors de sa première connexion.');
      } else if (accountType === 'ENSEIGNANT') {
        const response = await api.post('/teachers', {
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim(),
          telephone: form.telephone.trim() || undefined,
          teacher_registration_code: form.teacher_registration_code.trim(),
          specialty: form.specialty.trim(),
          initial_password: form.initial_password,
          initial_password_confirmation: form.initial_password_confirmation,
        });
        setTeachers((current) => [...current, resourceData(response)]);
        setSuccess('Le compte enseignant a été créé. L’enseignant devra changer son mot de passe lors de sa première connexion.');
      } else {
        await api.post('/staff-accounts', {
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim(),
          telephone: form.telephone.trim() || undefined,
          role: accountType,
          initial_password: form.initial_password,
          initial_password_confirmation: form.initial_password_confirmation,
        });
        setSuccess(`Le compte ${accountType === 'SECRETARIAT' ? 'secrétariat' : 'comptabilité'} a été créé. La personne devra changer son mot de passe lors de sa première connexion.`);
      }

      setForm(initialForm);
      setParentId('');
      try {
        const accountsResponse = await api.get('/accounts');
        setAccounts(resourceData(accountsResponse));
      } catch (refreshError) {
        setLoadError(refreshError.response?.data?.message || 'Le compte a été créé, mais la liste n’a pas pu être actualisée.');
      }
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setFormError(requestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function changeAccountStatus(account) {
    const nextStatus = account.status === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    setFormError('');
    setPendingAccountId(String(account.id));
    try {
      const response = await api.patch(`/accounts/${account.id}/status`, { status: nextStatus });
      const updatedAccount = resourceData(response);
      setAccounts((current) => current.map((item) => (
        item.id === updatedAccount.id ? updatedAccount : item
      )));
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setFormError(requestErrorMessage(requestError));
    } finally {
      setPendingAccountId('');
    }
  }

  async function resetAccountPassword(account) {
    setPasswordResetError('');
    setTemporaryPassword(null);
    setPendingPasswordResetId(String(account.id));
    try {
      const response = await api.post(`/accounts/${account.id}/temporary-password`);
      const data = resourceData(response);
      setTemporaryPassword({ account, value: data.temporary_password });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setPasswordResetError(requestError.response?.data?.message || 'Impossible de réinitialiser ce mot de passe.');
    } finally {
      setPendingPasswordResetId('');
    }
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  const content = (
    <section className="director-management">
      {!isStandalone ? (
        <div className="director-page-heading">
          <div>
            <h1>Gestion des comptes</h1>
            <p>Créez les accès du personnel et des parents, puis suspendez ou réactivez les comptes si nécessaire.</p>
          </div>
        </div>
      ) : <Link className="schedule-back-link" to="/dashboard">← Retour au tableau de bord</Link>}

      {loadError && <div className="director-alert" role="alert">{loadError}</div>}
      {success && <p className="account-success" role="status">{success}</p>}

      <div className="account-management-grid">
        <form className="account-create-form" onSubmit={handleSubmit}>
          <label>Type de compte
            <select value={accountType} onChange={(event) => {
              setAccountType(event.target.value);
              setFormError('');
              setSuccess('');
            }}>
              <option value="ENSEIGNANT">Enseignant</option>
              <option value="SECRETARIAT">Secrétariat</option>
              <option value="COMPTABILITE">Comptabilité</option>
              <option value="PARENT">Parent / tuteur déjà enregistré</option>
            </select>
          </label>

          {accountType === 'PARENT' ? (
            <>
              <label>Parent ou tuteur
                <select value={parentId} onChange={(event) => setParentId(event.target.value)} required disabled={isLoading}>
                  <option value="">{isLoading ? 'Chargement des parents…' : 'Sélectionner un parent'}</option>
                  {availableParents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.first_name} {parent.last_name} · {parent.telephone || 'Sans téléphone'}
                    </option>
                  ))}
                </select>
              </label>
              {!isLoading && availableParents.length === 0 && (
                <p className="account-form-hint">
                  Aucun parent sans compte n’est disponible. Inscrivez d’abord un élève avec les informations de son parent.
                  {' '}<Link to="/students">Aller aux inscriptions</Link>
                </p>
              )}
              <label>Email du parent<input name="email" type="email" value={form.email} onChange={updateForm} maxLength={150} required /></label>
            </>
          ) : (
            <>
              <label>Nom<input name="lastname" value={form.lastname} onChange={updateForm} maxLength={100} required /></label>
              <label>Prénom<input name="firstname" value={form.firstname} onChange={updateForm} maxLength={100} required /></label>
              <label>Email<input name="email" type="email" value={form.email} onChange={updateForm} maxLength={150} required /></label>
              <label>Téléphone <span>(facultatif)</span><input name="telephone" type="tel" value={form.telephone} onChange={updateForm} maxLength={20} /></label>
              {accountType === 'ENSEIGNANT' && (
                <>
                  <label>Code enseignant<input name="teacher_registration_code" value={form.teacher_registration_code} onChange={updateForm} maxLength={40} required /></label>
                  <label>Spécialité<input name="specialty" value={form.specialty} onChange={updateForm} maxLength={100} required /></label>
                </>
              )}
            </>
          )}

          <label>Mot de passe provisoire<input name="initial_password" type="password" autoComplete="new-password" minLength={12} value={form.initial_password} onChange={updateForm} required /></label>
          <label>Confirmer le mot de passe<input name="initial_password_confirmation" type="password" autoComplete="new-password" minLength={12} value={form.initial_password_confirmation} onChange={updateForm} required /></label>
          {formError && <p className="account-form-error" role="alert">{formError}</p>}
          <button className="director-export-button" type="submit" disabled={isSaving || (accountType === 'PARENT' && (!parentId || availableParents.length === 0))}>
            {isSaving ? 'Création du compte…' : 'Créer le compte'}
          </button>
        </form>

        <aside className="account-information-card">
          <h2>Comptes enseignants</h2>
          {isLoading ? <p className="director-loading">Chargement…</p> : teachers.length ? (
            <ul>{teachers.map((teacher) => (
              <li key={teacher.id}>
                <strong>{teacher.firstname} {teacher.lastname}</strong>
                <span>{teacher.specialty || teacher.teacher_registration_code}</span>
              </li>
            ))}</ul>
          ) : <p className="director-empty">Aucun compte enseignant créé.</p>}
          <p className="account-form-hint">
            Le secrétariat et la comptabilité pourront se connecter avec leur email et le mot de passe provisoire.
          </p>
        </aside>
      </div>

      <section className="account-list-panel">
        <div className="account-list-heading">
          <div>
            <h2>Comptes de l’établissement</h2>
            <p>Suspendre un compte bloque les prochaines connexions sans effacer l’historique scolaire.</p>
          </div>
        </div>
        {passwordResetError && <p className="account-form-error" role="alert">{passwordResetError}</p>}
        {temporaryPassword && (
          <div className="account-temporary-password" role="status">
            <strong>Mot de passe provisoire pour {temporaryPassword.account.firstname} {temporaryPassword.account.lastname}</strong>
            <code>{temporaryPassword.value}</code>
            <span>Communiquez-le au titulaire par un canal sûr. Il devra le remplacer dès sa prochaine connexion. Ce mot de passe ne sera plus affiché après avoir quitté cette page.</span>
          </div>
        )}
        {accounts.length ? (
          <div className="director-data-table-wrap">
            <table className="director-data-table">
              <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>État</th><th>Actions</th></tr></thead>
              <tbody>{accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.firstname} {account.lastname}</td>
                  <td>{account.email}</td>
                  <td>{({
                    ENSEIGNANT: 'Enseignant',
                    SECRETARIAT: 'Secrétariat',
                    COMPTABILITE: 'Comptabilité',
                    PARENT: 'Parent',
                  })[account.role] ?? account.role}</td>
                  <td><span className={`account-status ${account.status === 'ACTIF' ? 'active' : 'inactive'}`}>
                    {account.status === 'ACTIF' ? 'Actif' : 'Suspendu'}
                  </span></td>
                  <td>
                    <button
                      className="account-status-action"
                      type="button"
                      disabled={
                        String(account.id) === String(currentUserId)
                        || pendingAccountId === String(account.id)
                      }
                      onClick={() => changeAccountStatus(account)}
                    >
                      {pendingAccountId === String(account.id)
                        ? 'Mise à jour…'
                        : account.status === 'ACTIF' ? 'Suspendre' : 'Réactiver'}
                    </button>
                    <button
                      className="account-status-action account-password-reset-action"
                      type="button"
                      disabled={
                        String(account.id) === String(currentUserId ?? user.id)
                        || pendingPasswordResetId === String(account.id)
                      }
                      onClick={() => resetAccountPassword(account)}
                    >
                      {pendingPasswordResetId === String(account.id) ? 'Réinitialisation…' : 'Mot de passe provisoire'}
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : isLoading ? (
          <p className="director-loading">Chargement des comptes…</p>
        ) : <p className="director-empty">Aucun compte à afficher.</p>}
      </section>
    </section>
  );

  return isStandalone
    ? (
      <RoleDashboardLayout
        user={user}
        title="Gestion des comptes"
        description="Création, suspension et réactivation des accès de l’établissement."
      >
        {content}
      </RoleDashboardLayout>
    )
    : content;
}
