import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { initializeApiSession } from '../api/axios';
import './css/Login.css';

function errorMessage(error) {
  const errors = error.response?.data?.errors;
  return errors
    ? Object.values(errors).flat().join(' ')
    : error.response?.data?.message || 'Impossible de réinitialiser le mot de passe.';
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await initializeApiSession();
      await api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setIsComplete(true);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-root password-recovery-root">
      <nav className="login-nav">
        <div className="logo"><span>S+</span> ScolaPlus</div>
        <Link to="/login">← Retour à la connexion</Link>
      </nav>
      <section className="login-card password-recovery-card">
        <div className="login-right">
          <h3>Créer un nouveau mot de passe</h3>
          {isComplete ? (
            <>
              <p className="login-message success" role="status">
                Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.
              </p>
              <Link className="password-recovery-submit" to="/login">Retour à la connexion</Link>
            </>
          ) : !token || !email ? (
            <>
              <p className="login-message error" role="alert">
                Le lien est incomplet. Demandez un nouveau lien de réinitialisation.
              </p>
              <Link className="password-recovery-submit" to="/forgot-password">Demander un nouveau lien</Link>
            </>
          ) : (
            <>
              <p className="sub">Le nouveau mot de passe doit contenir au moins 12 caractères.</p>
              <form onSubmit={submit}>
                <label htmlFor="new-password">NOUVEAU MOT DE PASSE</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <label htmlFor="confirm-password">CONFIRMER LE MOT DE PASSE</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  required
                />
                {error && <p className="login-message error" role="alert">{error}</p>}
                <button className="btn-login" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Modification…' : 'Enregistrer le nouveau mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
