// import { useState } from "react"
// import api from "../api/axios"
// import "./Login.css"

// export default function Login() {
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")

//   const handleLogin = async (e) => {
//     e.preventDefault()
//     try {
//       const res = await api.post("/login", { email, password })
//       alert("Connecté !")
//       localStorage.setItem("token", res.data.token)
//     } catch (err) {
//       alert("Erreur: " + (err.response?.data?.message || err.message))
//     }
//   }

//   return (
//     <div className="login-container">
//       <div className="login-card">
//         <h2>Connexion Scola Plus</h2>
//         <form onSubmit={handleLogin}>
//           <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
//           <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required />
//           <button type="submit">Se connecter</button>
//         </form>
//       </div>
//     </div>
//   )
// }
import './Login.css';
import { GraduationCap, BookOpen, FileText, Coins, Users, Eye } from 'lucide-react';
import { useState } from 'react';

export default function Login() {
  const [role, setRole] = useState('Directeur');

  return (
    <div className="login-root">
      <nav className="login-nav">
        <div className="logo"><span>S+</span> ScolaPlus</div>
        <a href="/">← Retour à l'accueil</a>
      </nav>

      <div className="login-card">
        {/* LEFT */}
        <div className="login-left">
          <div className="left-logo"><span>S+</span></div>
          <h2>Complexe scolaire<br/><span>Les Bâtisseurs</span></h2>
          <p className="left-desc">Plateforme de gestion scolaire - de CP à la Terminale. Accès sécurisé par rôle pour chaque intervenant de l'école.</p>
          <p className="left-label">ENTREZ EN TANT QUE</p>
          
          <div className="role-list">
            <button className={role==='Directeur'?'active':''} onClick={()=>setRole('Directeur')}><GraduationCap size={16}/> Directeur <span>›</span></button>
            <button className={role==='Enseignant'?'active':''} onClick={()=>setRole('Enseignant')}><BookOpen size={16}/> Enseignant</button>
            <button className={role==='Secrétariat'?'active':''} onClick={()=>setRole('Secrétariat')}><FileText size={16}/> Secrétariat</button>
            <button className={role==='Comptabilité'?'active':''} onClick={()=>setRole('Comptabilité')}><Coins size={16}/> Comptabilité</button>
            <button className={role==='Parent'?'active':''} onClick={()=>setRole('Parent')}><Users size={16}/> Parent / Tuteur</button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="login-right">
          <h3>Connexion</h3>
          <p className="sub">Espace {role}</p>

          <label>ADRESSE EMAIL</label>
          <input type="email" defaultValue="directeur@lesbatisseurs.cd" />

          <div className="label-row">
            <label>MOT DE PASSE</label>
            <a href="#">Mot de passe oublié ?</a>
          </div>
          <div className="pass-wrap">
            <input type="password" defaultValue="123456" />
            <Eye size={16}/>
          </div>

          <button className="btn-login">Se connecter</button>

          <div className="demo-box">
            <strong>Compte démo - Directeur</strong>
            <p>Email: directeur@lesbatisseurs.cd<br/>Mot de passe: 0000002025</p>
            <span>Année scolaire <b>2024 - 2025</b></span>
          </div>
        </div>
      </div>
    </div>
  );
}