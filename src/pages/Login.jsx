import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Coins,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react';
import api, { initializeApiSession } from '../api/axios';
import './css/Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role');
  const availableRoles = ['Directeur', 'Enseignant', 'Secrétariat', 'Comptabilité', 'Parent'];
  const [role, setRole] = useState(availableRoles.includes(requestedRole) ? requestedRole : 'Directeur');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await initializeApiSession();
      const response = await api.post('/login', { email, password });
      const user = response.data?.user;

      if (!user?.role) {
        throw new Error('La réponse du serveur ne contient pas les informations du compte.');
      }

      navigate(user.must_change_password ? '/change-password' : '/dashboard', { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.message;
      setError(
        message ||
          (requestError.code === 'ERR_NETWORK'
            ? "Impossible de joindre le serveur. Vérifiez qu'il est démarré."
            : requestError.message || 'La connexion a échoué.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-root">
      <nav className="login-nav">
        <div className="logo"><span>S+</span> ScolaPlus</div>
        <Link to="/">← Retour à l'accueil</Link>
      </nav>

      <div className="login-card">
        <div className="login-left">
          <div className="left-logo"><span>S+</span></div>
          <h2>Complexe scolaire<br/><span>Les Bâtisseurs</span></h2>
          <p className="left-desc">Plateforme de gestion scolaire - de CP à la Terminale. Accès sécurisé par rôle pour chaque intervenant de l'école.</p>
          <p className="left-label">ENTREZ EN TANT QUE</p>

          <div className="role-list">
            <button type="button" className={role === 'Directeur' ? 'active' : ''} onClick={() => setRole('Directeur')}><GraduationCap size={16}/> Directeur <span>›</span></button>
            <button type="button" className={role === 'Enseignant' ? 'active' : ''} onClick={() => setRole('Enseignant')}><BookOpen size={16}/> Enseignant</button>
            <button type="button" className={role === 'Secrétariat' ? 'active' : ''} onClick={() => setRole('Secrétariat')}><FileText size={16}/> Secrétariat</button>
            <button type="button" className={role === 'Comptabilité' ? 'active' : ''} onClick={() => setRole('Comptabilité')}><Coins size={16}/> Comptabilité</button>
            <button type="button" className={role === 'Parent' ? 'active' : ''} onClick={() => setRole('Parent')}><Users size={16}/> Parent / Tuteur</button>
          </div>
        </div>

        <div className="login-right">
          <h3>Connexion</h3>
          <p className="sub">Espace {role}</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">ADRESSE EMAIL</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <div className="label-row">
              <label htmlFor="password">MOT DE PASSE</label>
              <Link className="forgot-password-link" to="/forgot-password">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="pass-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <p className="login-message error" role="alert">{error}</p>}
            <button className="btn-login" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion en cours…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
