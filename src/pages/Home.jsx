import './Home.css';
import { GraduationCap, BookOpen, FileText, Coins, Users, Pencil, Wallet, UserCheck, BarChart3, School, LogIn } from 'lucide-react';

export default function Home() {
  return (
    <div className="root">
      <section className="hero">
        <nav className="nav">
          <div className="logo"><span>S+</span> ScolaPlus</div>
          <button className="btn-connect">Se connecter <LogIn size={16}/></button>
        </nav>

        <div className="hero-content">
          <div className="badge"><span className="dot"></span>Complexe scolaire Les Bâtisseurs</div>
          <h1 className="hero-title">
            <span className="line-white">Bienvenue sur</span>
            <span className="line-orange">ScolaPlus</span>
          </h1>
          <p>Plateforme de gestion scolaire — élèves, notes, bulletins et frais de scolarité. Choisissez votre espace et connectez-vous.</p>
          
          {/* <div className="roles">
            <button className="active"><GraduationCap size={16}/> Directeur</button>
            <button><BookOpen size={16}/> Enseignant</button>
            <button><FileText size={16}/> Secrétariat</button>
            <button><Coins size={16}/> Comptabilité</button>
            <button><Users size={16}/> Parent</button>
          </div> */}
        </div>
      </section>



      <section className="modules">
        <div className="modules-head">
          <div><h2>Modules disponibles</h2><p>Gestion complète de l'établissement en un seul endroit</p></div>
          <button className="btn-dark">Accéder à l'application →</button>
        </div>

        <div className="grid">
          <div className="card c1"><div className="icon-box"><GraduationCap size={20}/></div><div><h4>Élèves</h4><p>Inscription, fiches et recherche d'élèves</p></div></div>
          <div className="card c2"><div className="icon-box"><Pencil size={20}/></div><div><h4>Notes & Bulletins</h4><p>Saisie des notes, moyennes, rangs et PDF</p></div></div>
          <div className="card c3"><div className="icon-box"><Wallet size={20}/></div><div><h4>Frais de scolarité</h4><p>Paiements par tranche, reçus, impayés</p></div></div>
          <div className="card c4"><div className="icon-box"><UserCheck size={20}/></div><div><h4>Espace parent</h4><p>Consultation des notes et de la situation financière</p></div></div>
          <div className="card c5"><div className="icon-box"><BarChart3 size={20}/></div><div><h4>Tableau de bord</h4><p>Vue globale pour le directeur</p></div></div>
          <div className="card c6"><div className="icon-box"><School size={20}/></div><div><h4>Classes & Matières</h4><p>Organisation des classes et coefficients</p></div></div>
        </div>

        <div className="cta">
          <div><h3>Prêt à gérer votre école ?</h3><p>Connectez-vous avec vos identifiants.</p></div>
          <button>Se connecter à ScolaPlus →</button>
        </div>
      </section>
      <footer>© 2025 ScolaPlus · Complexe scolaire Les Bâtisseurs <span>By kemolisa</span></footer>
    </div>
  );
}