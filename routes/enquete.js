const express = require('express');
const router = express.Router();
const db = require('../models/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random()*1E9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5*1024*1024 }, fileFilter: (req, file, cb) => {
  const allowed = ['.pdf','.jpg','.jpeg','.png'];
  allowed.includes(path.extname(file.originalname).toLowerCase()) ? cb(null,true) : cb(new Error('Format non accepte'));
}});

const questionnaires = {
  'credit': { titre: 'Demande de credit', icon: '💼', color: '#2d6a9f', questions: [
    { id: 'note_accueil', label: "Comment evaluez-vous l'accueil de votre conseiller ?", icon: '🤝' },
    { id: 'note_attente', label: "Etes-vous satisfait(e) du delai de traitement de votre dossier ?", icon: '⏱️' },
    { id: 'note_conseiller', label: "La clarte des informations fournies etait-elle satisfaisante ?", icon: '💬' },
    { id: 'note_traitement', label: "Le resultat obtenu correspond-il a vos attentes ?", icon: '✅' },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a cette experience ?", icon: '⭐' }
  ]},
  'ouverture': { titre: 'Ouverture de compte', icon: '🏦', color: '#1a7a4a', questions: [
    { id: 'note_accueil', label: "Comment evaluez-vous la qualite de l'accueil ?", icon: '😊' },
    { id: 'note_attente', label: "Le delai de traitement de votre dossier etait-il satisfaisant ?", icon: '⏱️' },
    { id: 'note_conseiller', label: "Les explications sur les produits etaient-elles claires ?", icon: '💬' },
    { id: 'note_traitement', label: "La procedure d'ouverture etait-elle simple et rapide ?", icon: '⚡' },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a cette experience ?", icon: '⭐' }
  ]},
  'gestionnaire': { titre: 'Echange avec votre gestionnaire', icon: '🤝', color: '#7b3fa0', questions: [
    { id: 'note_accueil', label: "Votre gestionnaire etait-il disponible et a l'ecoute ?", icon: '👂' },
    { id: 'note_conseiller', label: "Les conseils prodigues etaient-ils pertinents et adaptes ?", icon: '💡' },
    { id: 'note_traitement', label: "Votre demande a-t-elle ete traitee de maniere satisfaisante ?", icon: '✅' },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a cet echange ?", icon: '⭐' }
  ]},
  'digital': { titre: 'Services digitaux BCEG', icon: '📱', color: '#c0622a', questions: [
    { id: 'note_accueil', label: "La plateforme B-Online est-elle facile a utiliser ?", icon: '🖥️' },
    { id: 'note_attente', label: "La plateforme est-elle disponible et rapide ?", icon: '⚡' },
    { id: 'note_conseiller', label: "En cas de probleme, le support etait-il efficace ?", icon: '🛠️' },
    { id: 'note_applications', label: "Les fonctionnalites repondent-elles a vos besoins ?", icon: '🎯' },
    { id: 'note_globale', label: "Quelle note globale donnez-vous aux services digitaux BCEG ?", icon: '⭐' }
  ]},
  'default': { titre: 'Votre visite en agence', icon: '⭐', color: '#4d553d', questions: [
    { id: 'note_accueil', label: "Comment evaluez-vous l'accueil a votre arrivee en agence ?", icon: '😊' },
    { id: 'note_attente', label: "Etes-vous satisfait(e) du temps d'attente ?", icon: '⏱️' },
    { id: 'note_conseiller', label: "Comment evaluez-vous la qualite de votre conseiller ?", icon: '🤝' },
    { id: 'note_traitement', label: "Votre operation a-t-elle ete traitee rapidement et correctement ?", icon: '⚡' },
    { id: 'note_applications', label: "Etes-vous satisfait(e) des services numeriques de la BCEG ?", icon: '📱' },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a votre experience aujourd'hui ?", icon: '⭐' }
  ]}
};

function detecterType(t) {
  if (!t) return 'default';
  t = t.toLowerCase();
  if (t.includes('credit')||t.includes('pret')||t.includes('financement')) return 'credit';
  if (t.includes('ouverture')||t.includes('compte')) return 'ouverture';
  if (t.includes('gestionnaire')||t.includes('conseiller')||t.includes('rendez')) return 'gestionnaire';
  if (t.includes('digital')||t.includes('online')||t.includes('b-online')||t.includes('mobile')) return 'digital';
  return 'default';
}

function genererCSS(color) {
  return '*{box-sizing:border-box;margin:0;padding:0;}'
    + 'body{font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#f3f6f3 0%,#e8ede8 100%);min-height:100vh;color:#2c2c2c;}'
    + 'header{background:linear-gradient(135deg,' + color + ',' + color + 'cc);color:white;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 20px rgba(0,0,0,0.15);}'
    + 'header h1{font-size:22px;font-weight:800;}header p{font-size:11px;color:rgba(255,255,255,0.75);margin-top:2px;}'
    + '.badge-agence,.badge-demo{background:rgba(255,255,255,0.2);border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;}'
    + '.container{max-width:600px;margin:0 auto;padding:20px 16px 60px;}'
    + '.intro-card{background:white;border-radius:20px;padding:24px;margin-bottom:20px;box-shadow:0 8px 32px rgba(0,0,0,0.1);position:relative;overflow:hidden;}'
    + '.intro-card::before{content:"";position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,' + color + ',' + color + '88);}'
    + '.intro-card h2{font-size:20px;font-weight:800;color:#2c2c2c;margin-bottom:6px;}'
    + '.intro-card p{color:#666;font-size:14px;line-height:1.6;}'
    + '.badge-type{display:inline-flex;align-items:center;gap:6px;background:' + color + '15;color:' + color + ';border:1px solid ' + color + '30;border-radius:20px;padding:6px 14px;font-size:13px;font-weight:700;margin-top:12px;}'
    + '.badge-demo-info{background:#fff3cd;border:1px solid #ffc107;border-radius:10px;padding:10px 14px;margin-top:12px;font-size:12px;color:#856404;}'
    + '.global-progress{background:#e8ede8;border-radius:8px;height:6px;margin-top:16px;overflow:hidden;}'
    + '.global-progress-fill{height:6px;background:linear-gradient(90deg,' + color + ',' + color + '88);border-radius:8px;transition:width 0.4s ease;}'
    + '.question-card{background:white;border-radius:20px;padding:24px;margin-bottom:14px;box-shadow:0 4px 16px rgba(0,0,0,0.06);transition:all 0.3s;}'
    + '.question-card.answered{border-left:4px solid #27ae60;}'
    + '.progress-bar{height:3px;background:#f0f0f0;border-radius:3px;margin-bottom:16px;}'
    + '.progress-fill{height:3px;background:linear-gradient(90deg,' + color + ',' + color + '88);border-radius:3px;}'
    + '.question-meta{font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-weight:600;}'
    + '.question-label{font-size:16px;font-weight:700;color:#2c2c2c;margin-bottom:18px;line-height:1.4;display:flex;align-items:flex-start;gap:10px;}'
    + '.q-icon{font-size:22px;flex-shrink:0;}'
    + '.stars{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;}'
    + '.star-btn{padding:12px 4px;border:2px solid #e8e8e8;border-radius:12px;background:white;cursor:pointer;text-align:center;font-size:11px;font-weight:600;color:#888;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:4px;}'
    + '.star-btn:hover{border-color:' + color + ';background:' + color + '10;transform:translateY(-2px);}'
    + '.star-btn.selected{border-color:' + color + ';background:' + color + ';color:white;transform:translateY(-2px);}'
    + '.emoji{font-size:22px;}.btn-label{font-size:10px;}'
    + '.nps-grid{display:grid;grid-template-columns:repeat(11,1fr);gap:4px;}'
    + '.nps-btn{padding:10px 0;border:2px solid #e8e8e8;border-radius:10px;background:white;cursor:pointer;font-size:14px;font-weight:700;transition:all 0.2s;color:#555;}'
    + '.nps-btn:hover{border-color:' + color + ';transform:translateY(-2px);}'
    + '.nps-btn.selected{background:' + color + ';border-color:' + color + ';color:white;}'
    + '.nps-labels{display:flex;justify-content:space-between;margin-top:10px;font-size:11px;color:#aaa;font-weight:600;}'
    + 'textarea{width:100%;padding:14px 16px;border:2px solid #e8e8e8;border-radius:12px;font-size:14px;font-family:inherit;resize:vertical;min-height:100px;transition:all 0.2s;background:#fafafa;}'
    + 'textarea:focus{outline:none;border-color:' + color + ';background:white;}'
    + '.btn-row{display:flex;gap:12px;margin-top:8px;}'
    + '.submit-btn{flex:2;padding:18px;background:linear-gradient(135deg,' + color + ',' + color + 'cc);color:white;border:none;border-radius:14px;font-size:17px;font-weight:800;cursor:pointer;}'
    + '.rec-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 10px;background:linear-gradient(135deg,#c0622a,#e07b39);color:white;border-radius:14px;text-decoration:none;font-size:12px;font-weight:800;text-align:center;animation:pulse 2s infinite;}'
    + '@keyframes pulse{0%,100%{box-shadow:0 8px 24px rgba(192,98,42,0.35);}50%{box-shadow:0 8px 32px rgba(192,98,42,0.6);}}'
    + '.note-small{font-size:12px;color:#aaa;text-align:center;margin-top:14px;}'
    + '.success-screen{display:none;text-align:center;background:white;border-radius:24px;padding:48px 24px;box-shadow:0 16px 64px rgba(0,0,0,0.12);}';
}

function genererQuestionsHTML(q) {
  var total = q.questions.length + 2;
  return q.questions.map(function(quest, i) {
    var pct = Math.round(((i+1)/total)*100);
    var btns = [{v:1,e:'😞',l:'Tres mal'},{v:2,e:'😕',l:'Mal'},{v:3,e:'😐',l:'Moyen'},{v:4,e:'🙂',l:'Bien'},{v:5,e:'😄',l:'Tres bien'}].map(function(o) {
      return '<button type="button" class="star-btn" data-key="' + quest.id + '_' + i + '" data-val="' + o.v + '" onclick="selectNote(\'' + quest.id + '_' + i + '\',\'' + quest.id + '\',' + o.v + ',' + i + ')">'
        + '<span class="emoji">' + o.e + '</span><span class="btn-label">' + o.l + '</span></button>';
    }).join('');
    return '<div class="question-card" id="qcard-' + i + '">'
      + '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>'
      + '<div class="question-meta">Question ' + (i+1) + ' sur ' + total + '</div>'
      + '<div class="question-label"><span class="q-icon">' + quest.icon + '</span>' + quest.label + '</div>'
      + '<div class="stars">' + btns + '</div>'
      + '<input type="hidden" name="' + quest.id + '" id="hidden_' + quest.id + '">'
      + '</div>';
  }).join('');
}

function genererNPSetCommentaire(q, isDemo) {
  var total = q.questions.length + 2;
  var numNPS = q.questions.length + 1;
  var numCom = numNPS + 1;
  var pctNPS = Math.round((numNPS/total)*100);
  var npsbtns = [0,1,2,3,4,5,6,7,8,9,10].map(function(n) {
    return '<button type="button" class="nps-btn" onclick="selectNPS(' + n + ')">' + n + '</button>';
  }).join('');
  return '<div class="question-card" id="qcard-nps">'
    + '<div class="progress-bar"><div class="progress-fill" style="width:' + pctNPS + '%"></div></div>'
    + '<div class="question-meta">Question ' + numNPS + ' sur ' + total + '</div>'
    + '<div class="question-label"><span class="q-icon">🎯</span>Sur une echelle de 0 a 10, recommanderiez-vous la BCEG a un proche ?</div>'
    + '<div class="nps-grid" id="nps-grid">' + npsbtns + '</div>'
    + '<div class="nps-labels"><span>😞 Pas du tout</span><span>😄 Certainement</span></div>'
    + '<input type="hidden" name="score_nps" id="score_nps">'
    + '</div>'
    + '<div class="question-card">'
    + '<div class="progress-bar"><div class="progress-fill" style="width:100%"></div></div>'
    + '<div class="question-meta">Question ' + numCom + ' sur ' + total + ' — Optionnel</div>'
    + '<div class="question-label"><span class="q-icon">💬</span>Avez-vous un commentaire ou une suggestion ?</div>'
    + '<textarea name="commentaire" placeholder="Partagez votre experience..."></textarea>'
    + '</div>';
}

function genererScript(q) {
  return '<script>'
    + 'var answered={};'
    + 'function updateProgress(){var c=Object.keys(answered).length;document.getElementById("globalProgress").style.width=Math.round(c/' + (q.questions.length+2) + '*100)+"%";}'
    + 'function selectNote(key,fieldId,val,idx){answered[fieldId]=val;document.getElementById("hidden_"+fieldId).value=val;document.querySelectorAll("[data-key=\'"+key+"\']").forEach(function(btn,i){btn.classList.toggle("selected",i<val);});var card=document.getElementById("qcard-"+idx);if(card)card.classList.add("answered");updateProgress();}'
    + 'function selectNPS(val){answered["nps"]=val;document.getElementById("score_nps").value=val;document.getElementById("nps-grid").querySelectorAll(".nps-btn").forEach(function(btn){btn.classList.toggle("selected",parseInt(btn.textContent)===val);});document.getElementById("qcard-nps").classList.add("answered");updateProgress();}'
    + 'document.getElementById("enqueteForm").addEventListener("submit",function(e){e.preventDefault();var btn=this.querySelector(".submit-btn");btn.textContent="Envoi...";btn.disabled=true;var form=e.target;var data={enquete_id:form.enquete_id.value,note_accueil:form.note_accueil?(form.note_accueil.value||3):3,note_attente:form.note_attente?(form.note_attente.value||3):3,note_conseiller:form.note_conseiller?(form.note_conseiller.value||3):3,note_traitement:form.note_traitement?(form.note_traitement.value||3):3,note_applications:form.note_applications?(form.note_applications.value||3):3,note_globale:form.note_globale?(form.note_globale.value||3):3,score_nps:form.score_nps.value||7,commentaire:form.commentaire.value};fetch("/enquete/repondre",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).then(function(){form.style.display="none";document.querySelector(".intro-card").style.display="none";document.getElementById("successScreen").style.display="block";window.scrollTo(0,0);}).catch(function(){form.style.display="none";document.querySelector(".intro-card").style.display="none";document.getElementById("successScreen").style.display="block";});});'
    + '</script>';
}

// PAGE RECLAMATION
router.get('/reclamation', (req, res) => {
  res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Reclamation - BCEG</title>'
    + '<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#f3f6f3,#e8ede8);min-height:100vh;}header{background:linear-gradient(135deg,#4d553d,#3a4130);color:white;padding:20px 24px;}header h1{font-size:22px;font-weight:800;}header p{font-size:12px;color:#c8d4c8;margin-top:2px;}.container{max-width:600px;margin:0 auto;padding:20px 16px 60px;}.intro-card{background:white;border-radius:20px;padding:24px;margin-bottom:20px;border-left:6px solid #c0622a;box-shadow:0 8px 32px rgba(0,0,0,0.1);}.intro-card h2{color:#c0622a;font-size:20px;margin-bottom:8px;font-weight:800;}.intro-card p{color:#666;font-size:14px;line-height:1.6;}.card{background:white;border-radius:16px;padding:22px;margin-bottom:14px;box-shadow:0 4px 16px rgba(0,0,0,0.06);}label{display:block;font-weight:700;font-size:13px;color:#444;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;}input[type=text],input[type=email],input[type=tel],select,textarea{width:100%;padding:14px 16px;border:2px solid #e8e8e8;border-radius:10px;font-size:15px;font-family:inherit;transition:all 0.2s;background:#fafafa;}input:focus,select:focus,textarea:focus{outline:none;border-color:#c0622a;background:white;}textarea{resize:vertical;min-height:120px;}.upload-zone{border:2px dashed #c8d4c8;border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:all 0.2s;background:#fafafa;}.upload-zone:hover{border-color:#c0622a;background:#fdf5f2;}.upload-zone .icon{font-size:40px;margin-bottom:8px;}.upload-zone p{color:#888;font-size:14px;}.hint{font-size:12px;color:#aaa;margin-top:4px;}input[type=file]{display:none;}.file-preview{margin-top:12px;font-size:13px;color:#4d553d;font-weight:600;background:#e8ede8;padding:8px 12px;border-radius:8px;display:none;}.submit-btn{width:100%;padding:18px;background:linear-gradient(135deg,#c0622a,#e07b39);color:white;border:none;border-radius:12px;font-size:18px;font-weight:800;cursor:pointer;margin-top:8px;box-shadow:0 8px 24px rgba(192,98,42,0.4);transition:all 0.2s;}.submit-btn:hover{transform:translateY(-2px);}.retour-link{display:block;text-align:center;margin-top:20px;color:#a6aa9e;font-size:13px;text-decoration:none;}.success-screen{display:none;text-align:center;background:white;border-radius:20px;padding:48px 24px;box-shadow:0 16px 64px rgba(0,0,0,0.12);}.numero{font-size:28px;font-weight:800;color:#4d553d;background:linear-gradient(135deg,#e8ede8,#d5e8d5);padding:16px 28px;border-radius:12px;display:inline-block;margin:20px 0;letter-spacing:3px;}</style>'
    + '</head><body>'
    + '<header><h1>BCEG</h1><p>Banque pour le Commerce et l\'Entrepreneuriat du Gabon</p></header>'
    + '<div class="container">'
    + '<div class="intro-card"><h2>⚠️ Deposer une reclamation</h2><p>Vous avez rencontre un probleme ? Decrivez-le ci-dessous. Notre equipe vous repondra dans les <strong>48 heures ouvrables</strong>.</p></div>'
    + '<form id="reclamationForm">'
    + '<div class="card"><label>Votre nom complet *</label><input type="text" name="nom" placeholder="Ex : ONDO Jean-Baptiste" required></div>'
    + '<div class="card"><label>Votre numero de telephone *</label><input type="tel" name="telephone" placeholder="Ex : 06 12 34 56" required></div>'
    + '<div class="card"><label>Votre adresse email (optionnel)</label><input type="email" name="email" placeholder="Ex : votre@email.com"></div>'
    + '<div class="card"><label>Agence concernee *</label><select name="agence" required><option value="">-- Selectionnez votre agence --</option><option>Agence Okoume (Siege)</option><option>Agence Movingui</option><option>Agence Bilinga</option><option>Point Cash Tali</option><option>Point Cash Akanda</option><option>Bureau Ozigo (Port-Gentil)</option><option>Agence Azobe</option><option>Autre</option></select></div>'
    + '<div class="card"><label>Categorie de la reclamation *</label><select name="categorie" required><option value="">-- Selectionnez une categorie --</option><option>Delai de traitement trop long</option><option>Erreur sur mon compte</option><option>Probleme avec un virement</option><option>Probleme avec ma carte bancaire</option><option>Probleme avec B-Online</option><option>Comportement du personnel</option><option>Probleme avec un credit</option><option>Frais non justifies</option><option>Autre</option></select></div>'
    + '<div class="card"><label>Description detaillee *</label><textarea name="description" placeholder="Decrivez votre probleme avec le maximum de details..." required></textarea></div>'
    + '<div class="card"><label>Joindre un document (optionnel)</label><div class="upload-zone" onclick="document.getElementById(\'fichier\').click()"><div class="icon">📎</div><p>Cliquez pour ajouter un document</p><p class="hint">PDF, JPG, PNG — max 5 Mo</p></div><input type="file" id="fichier" name="fichier" accept=".pdf,.jpg,.jpeg,.png" onchange="afficherFichier(this)"><div class="file-preview" id="filePreview"></div></div>'
    + '<button type="submit" class="submit-btn">Envoyer ma reclamation</button>'
    + '<a href="javascript:history.back()" class="retour-link">← Retour au questionnaire</a>'
    + '</form>'
    + '<div class="success-screen" id="successScreen"><div style="font-size:72px;margin-bottom:16px;">✅</div><h2 style="color:#4d553d;font-size:26px;margin-bottom:12px;font-weight:800;">Reclamation enregistree !</h2><p style="color:#666;font-size:15px;">Votre numero de suivi :</p><div class="numero" id="numeroSuivi"></div><p style="color:#666;font-size:14px;">Notre equipe vous contactera dans les <strong>48 heures</strong> ouvrables.</p><br><p style="color:#4d553d;font-weight:800;font-size:16px;">Merci de votre confiance.</p></div>'
    + '</div>'
    + '<script>function afficherFichier(input){var p=document.getElementById("filePreview");if(input.files&&input.files[0]){p.textContent="Fichier : "+input.files[0].name;p.style.display="block";}}document.getElementById("reclamationForm").addEventListener("submit",function(e){e.preventDefault();var btn=this.querySelector(".submit-btn");btn.textContent="Envoi...";btn.disabled=true;var formData=new FormData(e.target);fetch("/enquete/reclamation/soumettre",{method:"POST",body:formData}).then(function(r){return r.json();}).then(function(data){document.getElementById("numeroSuivi").textContent=data.numero||"REC-000000";e.target.style.display="none";document.querySelector(".intro-card").style.display="none";document.getElementById("successScreen").style.display="block";window.scrollTo(0,0);}).catch(function(){document.getElementById("numeroSuivi").textContent="REC-"+Date.now().toString().slice(-6);e.target.style.display="none";document.querySelector(".intro-card").style.display="none";document.getElementById("successScreen").style.display="block";});});</script>'
    + '</body></html>');
});

// SOUMISSION RECLAMATION
router.post('/reclamation/soumettre', upload.single('fichier'), (req, res) => {
  const { nom, telephone, email, agence, categorie, description } = req.body;
  const numero = 'REC-' + Date.now().toString().slice(-6);
  const fichierNom = req.file ? req.file.originalname : null;
  const fichierPath = req.file ? req.file.filename : null;
  db.run('INSERT INTO reclamations (numero_suivi,nom_client,telephone,email,agence,categorie,description,fichier_nom,fichier_path) VALUES (?,?,?,?,?,?,?,?,?)',
    [numero,nom,telephone,email||'',agence,categorie,description,fichierNom,fichierPath],
    function(err) {
      if (err) return res.status(500).json({ error: 'Erreur', numero: 'REC-'+Date.now().toString().slice(-6) });
      res.json({ success: true, numero, id: this.lastID });
    }
  );
});

// SERVIR LES FICHIERS
router.get('/fichier/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send('Fichier non trouve');
});

// ROUTES DE DEMONSTRATION
router.get('/demo/:type', (req, res) => {
  const type = req.params.type;
  const q = questionnaires[type] || questionnaires['default'];
  const css = genererCSS(q.color);
  const questionsHTML = genererQuestionsHTML(q);
  const npsComHTML = genererNPSetCommentaire(q, true);
  const scriptHTML = genererScript(q);

  res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Demo ' + q.titre + ' - BCEG</title><style>' + css + '</style></head><body>'
    + '<header><div><h1>BCEG</h1><p>Banque pour le Commerce et l\'Entrepreneuriat du Gabon</p></div><div class="badge-demo">Mode Demo</div></header>'
    + '<div class="container">'
    + '<div class="intro-card">'
    + '<h2>Bonjour Client Demo ! 👋</h2>'
    + '<p>Votre avis compte beaucoup pour la BCEG. Cette enquete prend moins de <strong>2 minutes</strong>.</p>'
    + '<div class="badge-type">' + q.icon + ' ' + q.titre + '</div>'
    + '<div class="badge-demo-info">⚠️ Mode demonstration — Questionnaire recu apres : <b>' + q.titre + '</b></div>'
    + '<div class="global-progress"><div class="global-progress-fill" id="globalProgress" style="width:0%"></div></div>'
    + '</div>'
    + '<form id="enqueteForm">'
    + '<input type="hidden" name="enquete_id" value="0">'
    + questionsHTML
    + npsComHTML
    + '<div class="btn-row">'
    + '<button type="submit" class="submit-btn">Envoyer mon avis ✓</button>'
    + '<a href="/enquete/reclamation" class="rec-btn"><span style="font-size:22px;">⚠️</span><span>Reclamation</span></a>'
    + '</div>'
    + '<p class="note-small">🔒 Vos reponses sont confidentielles</p>'
    + '</form>'
    + '<div class="success-screen" id="successScreen">'
    + '<div style="font-size:72px;margin-bottom:16px;">🎉</div>'
    + '<h2 style="font-size:26px;font-weight:800;color:#4d553d;margin-bottom:12px;">Merci pour votre avis !</h2>'
    + '<p style="color:#666;font-size:15px;">Votre retour a bien ete enregistre.</p>'
    + '<br><p style="color:' + q.color + ';font-weight:800;font-size:18px;">Bonne journee ! 😊</p>'
    + '</div>'
    + '</div>'
    + scriptHTML
    + '</body></html>');
});

// PAGE QUESTIONNAIRE CLIENT (depuis SMS)
router.get('/:clientId', (req, res) => {
  db.get('SELECT c.*, o.id as operation_id, o.type_operation, a.nom as agence_nom FROM clients c LEFT JOIN operations o ON o.client_id=c.id LEFT JOIN agences a ON a.id=c.agence_id WHERE c.id=?',
    [req.params.clientId], (err, client) => {
    if (!client) client = { id: req.params.clientId, nom: 'Client', prenom: 'Demo BCEG', operation_id: null, type_operation: 'Visite en agence', agence_nom: 'BCEG' };
    const q = questionnaires[detecterType(client.type_operation)];
    const css = genererCSS(q.color);
    const questionsHTML = genererQuestionsHTML(q);
    const npsComHTML = genererNPSetCommentaire(q, false);
    const scriptHTML = genererScript(q);

    res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
      + '<title>Enquete Satisfaction - BCEG</title><style>' + css + '</style></head><body>'
      + '<header><div><h1>BCEG</h1><p>Banque pour le Commerce et l\'Entrepreneuriat du Gabon</p></div><div class="badge-agence">' + (client.agence_nom||'BCEG') + '</div></header>'
      + '<div class="container">'
      + '<div class="intro-card">'
      + '<h2>Bonjour ' + client.prenom + ' ' + client.nom + ' ! 👋</h2>'
      + '<p>Votre avis compte beaucoup pour la BCEG. Cette enquete prend moins de <strong>2 minutes</strong>.</p>'
      + '<div class="badge-type">' + q.icon + ' ' + q.titre + '</div>'
      + '<div class="global-progress"><div class="global-progress-fill" id="globalProgress" style="width:0%"></div></div>'
      + '</div>'
      + '<form id="enqueteForm">'
      + '<input type="hidden" name="enquete_id" value="' + (client.operation_id||0) + '">'
      + questionsHTML
      + npsComHTML
      + '<div class="btn-row">'
      + '<button type="submit" class="submit-btn">Envoyer mon avis ✓</button>'
      + '<a href="/enquete/reclamation" class="rec-btn"><span style="font-size:22px;">⚠️</span><span>Reclamation</span></a>'
      + '</div>'
      + '<p class="note-small">🔒 Vos reponses sont confidentielles et utilisees uniquement pour ameliorer nos services.</p>'
      + '</form>'
      + '<div class="success-screen" id="successScreen">'
      + '<div style="font-size:72px;margin-bottom:16px;">🎉</div>'
      + '<h2 style="font-size:26px;font-weight:800;color:#4d553d;margin-bottom:12px;">Merci pour votre avis !</h2>'
      + '<p style="color:#666;font-size:15px;">Votre retour a bien ete enregistre.<br>La BCEG vous remercie de votre confiance.</p>'
      + '<br><p style="color:' + q.color + ';font-weight:800;font-size:18px;">Bonne journee ! 😊</p>'
      + '</div>'
      + '</div>'
      + scriptHTML
      + '</body></html>');
  });
});

// ENREGISTREMENT REPONSE
router.post('/repondre', (req, res) => {
  const {enquete_id,note_accueil,note_attente,note_conseiller,note_traitement,note_applications,note_globale,score_nps,commentaire} = req.body;
  db.run('INSERT INTO reponses (enquete_id,note_accueil,note_attente,note_conseiller,note_traitement,note_applications,note_globale,score_nps,commentaire,date_reponse) VALUES (?,?,?,?,?,?,?,?,?,datetime("now"))',
    [enquete_id||0,note_accueil||3,note_attente||3,note_conseiller||3,note_traitement||3,note_applications||3,note_globale||3,score_nps||7,commentaire||''],
    function(err) {
      if(err) return res.status(500).json({error:'Erreur'});
      res.json({success:true,id:this.lastID});
    }
  );
});

module.exports = router;
