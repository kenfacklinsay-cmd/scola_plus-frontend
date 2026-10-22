import { ArrowRight, BookOpen, ChartNoAxesColumn, GraduationCap, PencilLine, School, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import './css/Home.css';

const roles = [
  { label: 'Directeur', icon: GraduationCap },
  { label: 'Enseignant', icon: BookOpen },
  { label: 'Secrétariat', icon: Users },
  { label: 'Comptabilité', icon: Wallet },
  { label: 'Parent', icon: Users },
];

const modules = [
  { title: 'Élèves', description: "Inscription, fiches et recherche d’élèves", icon: GraduationCap, tone: 'blue' },
  { title: 'Notes & Bulletins', description: 'Saisie des notes, moyennes, rangs et PDF', icon: PencilLine, tone: 'yellow' },
  { title: 'Frais de scolarité', description: 'Paiements par tranche, reçus, impayés', icon: Wallet, tone: 'green' },
  { title: 'Espace parent', description: 'Consultation des notes et de la situation financière', icon: Users, tone: 'pink' },
  { title: 'Tableau de bord', description: "Vue globale pour le directeur de l’établissement", icon: ChartNoAxesColumn, tone: 'purple' },
  { title: 'Classes & Matières', description: 'Organisation des classes et coefficients', icon: School, tone: 'slate' },
];

function loginUrl(role = 'Directeur') {
  return `/login?role=${encodeURIComponent(role)}`;
}

export default function Home() {
  return (
    <main className="scola-home">
      <section className="home-hero">
        <nav className="home-nav" aria-label="Navigation principale">
          <Link className="home-brand" to="/" aria-label="ScolaPlus, accueil">
            <span className="brand-mark">S+</span>
            <span>Scola<span className="brand-accent">Plus</span></span>
          </Link>
          <Link className="button button-orange nav-login" to={loginUrl()}>
            Se connecter <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </nav>

        <div className="hero-inner">
          <p className="school-badge"><span aria-hidden="true" />Complexe scolaire Les Bâtisseurs · 2026–2027</p>
          <h1>Bienvenue sur<br /><span>ScolaPlus</span></h1>
          <p className="hero-description">
            Plateforme de gestion scolaire — élèves, notes, bulletins et frais de scolarité.
            Choisissez votre espace ou connectez-vous.
          </p>
          <div className="role-links" aria-label="Choisir un espace de connexion">
            {roles.map(({ label, icon: Icon }, index) => (
              <Link
                className={`role-link${index === 0 ? ' role-link-active' : ''}`}
                key={label}
                to={loginUrl(label)}
              >
                <Icon size={17} aria-hidden="true" />{label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-content">
        <div className="modules-heading">
          <div>
            <h2>Modules disponibles</h2>
            <p>Gestion complète de l’établissement en un seul endroit</p>
          </div>
          <Link className="button button-navy modules-action" to={loginUrl()}>
            Accéder à l’application <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>

        <div className="module-grid">
          {modules.map(({ title, description, icon: Icon, tone }) => (
            <article className={`module-card module-${tone}`} key={title}>
              <span className="module-icon"><Icon size={27} strokeWidth={2.1} aria-hidden="true" /></span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="home-cta">
          <div>
            <h2>Prêt à gérer votre école ?</h2>
            <p>Connectez-vous avec vos identifiants pour accéder à votre espace.</p>
          </div>
          <Link className="button button-orange cta-action" to={loginUrl()}>
            Se connecter à ScolaPlus <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <span>© 2026 ScolaPlus · Complexe scolaire Les Bâtisseurs</span>
        <span>kenfacklinsay@gmail.com</span>
      </footer>
    </main>
  );
}
