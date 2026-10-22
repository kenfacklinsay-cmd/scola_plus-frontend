import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { initializeApiSession } from '../api/axios';
import './css/ChangePassword.css';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await initializeApiSession();
      await api.put('/account/password', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      const errors = requestError.response?.data?.errors;
      setError(
        errors
          ? Object.values(errors).flat().join(' ')
          : requestError.response?.data?.message || 'Impossible de modifier le mot de passe.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="password-page">
      <form className="password-card" onSubmit={handleSubmit}>
        <span className="password-brand">S+</span>
        <p className="dashboard-eyebrow">SÉCURISATION DU COMPTE</p>
        <h1>Choisissez un nouveau mot de passe</h1>
        <p className="password-intro">Votre compte nécessite un changement de mot de passe avant de continuer.</p>

        <label htmlFor="current-password">Mot de passe actuel</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />

        <label htmlFor="new-password">Nouveau mot de passe</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <label htmlFor="password-confirmation">Confirmer le nouveau mot de passe</label>
        <input
          id="password-confirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          required
        />

        {error && <p className="password-error" role="alert">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Modification…' : 'Enregistrer le nouveau mot de passe'}
        </button>
      </form>
    </main>
  );
}
