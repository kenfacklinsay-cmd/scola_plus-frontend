import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { initializeApiSession } from '../api/axios';
import './css/Login.css';

function errorMessage(error) {
  const errors = error.response?.data?.errors;
  return errors
    ? Object.values(errors).flat().join(' ')
    : error.response?.data?.message || 'Impossible d’envoyer la demande. Réessayez plus tard.';
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);

    try {
      await initializeApiSession();
      const response = await api.post('/forgot-password', { email: email.trim() });
      setMessage(response.data.message);
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
          <h3>Mot de passe oublié ?</h3>
          <p className="sub">Nous vous enverrons un lien sécurisé pour en choisir un nouveau.</p>
          <form onSubmit={submit}>
            <label htmlFor="recovery-email">ADRESSE E-MAIL DU COMPTE</label>
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {message && <p className="login-message success" role="status">{message}</p>}
            {error && <p className="login-message error" role="alert">{error}</p>}
            <button className="btn-login" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation'}
            </button>
          </form>
          <p className="password-recovery-help">
            Vous n’avez plus accès à cette adresse ? Contactez le Directeur ou le Secrétariat.
          </p>
        </div>
      </section>
    </main>
  );
}
