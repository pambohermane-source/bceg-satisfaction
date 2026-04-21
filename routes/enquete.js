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
  'credit': { titre: 'Demande de credit', icon: '💼', color: '#2d6a9f', gradient: 'linear-gradient(135deg,#2d6a9f,#1a4a7a)', questions: [
    { id: 'note_accueil', label: "Comment evaluez-vous l'accueil de votre conseiller ?", icon: '🤝', emoji: true },
    { id: 'note_attente', label: "Le delai de traitement de votre dossier etait-il satisfaisant ?", icon: '⏱️', emoji: true },
    { id: 'note_conseiller', label: "La clarte des informations fournies etait-elle satisfaisante ?", icon: '💬', emoji: true },
    { id: 'note_traitement', label: "Le resultat obtenu correspond-il a vos attentes ?", icon: '✅', emoji: true },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a cette experience ?", icon: '⭐', emoji: true }
  ]},
  'ouverture': { titre: 'Ouverture de compte', icon: '🏦', color: '#1a7a4a', gradient: 'linear-gradient(135deg,#1a7a4a,#0d5233)', questions: [
    { id: 'note_accueil', label: "Comment evaluez-vous la qualite de l'accueil ?", icon: '😊', emoji: true },
    { id: 'note_attente', label: "Le delai de traitement de votre dossier etait-il satisfaisant ?", icon: '⏱️', emoji: true },
    { id: 'note_conseiller', label: "Les explications sur les produits etaient-elles claires ?", icon: '💬', emoji: true },
    { id: 'note_traitement', label: "La procedure d'ouverture etait-elle simple et rapide ?", icon: '⚡', emoji: true },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a cette experience ?", icon: '⭐', emoji: true }
  ]},
  'gestionnaire': { titre: 'Echange avec votre gestionnaire', icon: '🤝', color: '#7b3fa0', gradient: 'linear-gradient(135deg,#7b3fa0,#5a2d78)', questions: [
    { id: 'note_accueil', label: "Votre gestionnaire etait-il disponible et a l'ecoute ?", icon: '👂', emoji: true },
    { id: 'note_conseiller', label: "Les conseils prodigues etaient-ils pertinents et adaptes ?", icon: '💡', emoji: true },
    { id: 'note_traitement', label: "Votre demande a-t-elle ete traitee de maniere satisfaisante ?", icon: '✅', emoji: true },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a cet echange ?", icon: '⭐', emoji: true }
  ]},
  'digital': { titre: 'Services digitaux BCEG', icon: '📱', color: '#c0622a', gradient: 'linear-gradient(135deg,#c0622a,#a04d1f)', questions: [
    { id: 'note_accueil', label: "La plateforme B-Online est-elle facile a utiliser ?", icon: '🖥️', emoji: true },
    { id: 'note_attente', label: "La plateforme est-elle disponible et rapide ?", icon: '⚡', emoji: true },
    { id: 'note_conseiller', label: "En cas de probleme, le support etait-il efficace ?", icon: '🛠️', emoji: true },
    { id: 'note_applications', label: "Les fonctionnalites repondent-elles a vos besoins ?", icon: '🎯', emoji: true },
    { id: 'note_globale', label: "Quelle note globale donnez-vous aux services digitaux ?", icon: '⭐', emoji: true }
  ]},
  'default': { titre: 'Votre visite en agence', icon: '🏦', color: '#4d553d', gradient: 'linear-gradient(135deg,#4d553d,#3a4130)', questions: [
    { id: 'note_accueil', label: "Comment evaluez-vous l'accueil a votre arrivee en agence ?", icon: '😊', emoji: true },
    { id: 'note_attente', label: "Etes-vous satisfait(e) du temps d'attente ?", icon: '⏱️', emoji: true },
    { id: 'note_conseiller', label: "Comment evaluez-vous la qualite de votre conseiller ?", icon: '🤝', emoji: true },
    { id: 'note_traitement', label: "Votre operation a-t-elle ete traitee rapidement ?", icon: '⚡', emoji: true },
    { id: 'note_applications', label: "Etes-vous satisfait(e) des services numeriques de la BCEG ?", icon: '📱', emoji: true },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a votre experience ?", icon: '⭐', emoji: true }
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

function genererPage(q, client, isDemo) {
  var total = q.questions.length + 2;
  var color = q.color;
  var gradient = q.gradient;
  var agenceNom = client.agence_nom || 'BCEG';
  var clientNom = client.prenom + ' ' + client.nom;
  var enqueteId = client.operation_id || 0;

  var questionsData = JSON.stringify(q.questions.map(function(quest) {
    return { id: quest.id, label: quest.label, icon: quest.icon };
  }));

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<title>Enquete BCEG</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{height:100%;overflow:hidden;}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f3f0;color:#2c2c2c;}

/* HEADER */
.header{${gradient};padding:20px 24px 60px;position:relative;overflow:hidden;}
.header::after{content:'';position:absolute;bottom:-30px;left:0;right:0;height:60px;background:#f0f3f0;border-radius:50% 50% 0 0;}
.header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.bceg-logo{font-size:20px;font-weight:900;color:white;letter-spacing:-0.5px;}
.agence-pill{background:rgba(255,255,255,0.2);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.3);color:white;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;}
.header-greeting{color:rgba(255,255,255,0.9);font-size:13px;margin-bottom:6px;}
.header-name{color:white;font-size:20px;font-weight:800;}
.header-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.15);border-radius:20px;padding:5px 12px;font-size:12px;color:rgba(255,255,255,0.9);margin-top:8px;}

/* PROGRESS */
.progress-wrap{padding:0 24px;margin-top:8px;position:relative;z-index:1;}
.progress-info{display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:8px;font-weight:600;}
.progress-bar{height:6px;background:#e0e5e0;border-radius:10px;overflow:hidden;}
.progress-fill{height:6px;border-radius:10px;transition:width 0.5s cubic-bezier(0.4,0,0.2,1);}

/* SCREEN */
.screen{position:fixed;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;overflow:hidden;}
.content-area{flex:1;overflow:hidden;position:relative;padding-top:8px;}

/* CARDS */
.slide{position:absolute;top:0;left:0;right:0;bottom:0;padding:16px 20px 20px;display:flex;flex-direction:column;transition:transform 0.45s cubic-bezier(0.4,0,0.2,1),opacity 0.45s ease;overflow-y:auto;}
.slide.hidden-right{transform:translateX(100%);opacity:0;pointer-events:none;}
.slide.hidden-left{transform:translateX(-100%);opacity:0;pointer-events:none;}
.slide.active{transform:translateX(0);opacity:1;}

.question-card{background:white;border-radius:24px;padding:28px 24px;box-shadow:0 8px 40px rgba(0,0,0,0.1);flex:1;display:flex;flex-direction:column;min-height:0;}
.q-icon-big{font-size:48px;margin-bottom:16px;display:block;animation:bounceIn 0.5s ease;}
@keyframes bounceIn{0%{transform:scale(0.5);opacity:0;}60%{transform:scale(1.1);}100%{transform:scale(1);opacity:1;}}
.q-label{font-size:18px;font-weight:800;color:#2c2c2c;line-height:1.4;margin-bottom:28px;flex:1;}
.options{display:flex;flex-direction:column;gap:12px;}
.option-btn{display:flex;align-items:center;gap:14px;padding:16px 18px;border:2px solid #e8e8e8;border-radius:16px;background:#fafafa;cursor:pointer;transition:all 0.2s;text-align:left;width:100%;}
.option-btn:active{transform:scale(0.97);}
.option-btn.selected{border-color:${color};background:${color}12;}
.option-emoji{font-size:24px;flex-shrink:0;}
.option-text{font-size:15px;font-weight:600;color:#333;}
.option-check{margin-left:auto;width:24px;height:24px;border-radius:50%;background:#e8e8e8;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s;}
.option-btn.selected .option-check{background:${color};}
.option-check svg{display:none;}
.option-btn.selected .option-check svg{display:block;}

/* NPS */
.nps-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:10px;}
.nps-grid2{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;}
.nps-btn{padding:14px 0;border:2px solid #e8e8e8;border-radius:14px;background:#fafafa;cursor:pointer;font-size:16px;font-weight:800;color:#555;transition:all 0.2s;text-align:center;}
.nps-btn:active{transform:scale(0.93);}
.nps-btn.selected{background:${color};border-color:${color};color:white;transform:scale(1.05);}
.nps-labels{display:flex;justify-content:space-between;font-size:11px;color:#aaa;margin-top:6px;font-weight:600;}

/* COMMENTAIRE */
.comment-area{border:2px solid #e8e8e8;border-radius:16px;padding:16px;font-size:15px;font-family:inherit;resize:none;width:100%;min-height:120px;background:#fafafa;transition:all 0.2s;}
.comment-area:focus{outline:none;border-color:${color};background:white;}
.optional-badge{background:${color}15;color:${color};padding:4px 10px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:12px;}

/* NAVIGATION */
.nav-area{padding:16px 20px;background:#f0f3f0;}
.nav-btns{display:flex;gap:12px;}
.btn-back{flex:1;padding:16px;border:2px solid #ddd;border-radius:16px;background:white;font-size:15px;font-weight:700;color:#888;cursor:pointer;transition:all 0.2s;}
.btn-next{flex:2;padding:16px;border:none;border-radius:16px;font-size:16px;font-weight:800;color:white;cursor:pointer;transition:all 0.2s;box-shadow:0 8px 24px ${color}40;}
.btn-next:active,.btn-back:active{transform:scale(0.97);}
.btn-next:disabled{opacity:0.5;cursor:not-allowed;}

/* RECLAMATION BTN */
.rec-floating{position:fixed;bottom:100px;right:20px;background:linear-gradient(135deg,#c0622a,#e07b39);color:white;border:none;border-radius:20px;padding:12px 18px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(192,98,42,0.4);display:flex;align-items:center;gap:8px;text-decoration:none;z-index:100;animation:pulse2 2s infinite;}
@keyframes pulse2{0%,100%{box-shadow:0 8px 24px rgba(192,98,42,0.4);}50%{box-shadow:0 8px 32px rgba(192,98,42,0.7);}}

/* SUCCES */
.success-screen{position:fixed;top:0;left:0;right:0;bottom:0;background:white;display:none;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;z-index:200;}
.success-screen.show{display:flex;}
.success-anim{font-size:80px;animation:pop 0.6s cubic-bezier(0.36,0.07,0.19,0.97);}
@keyframes pop{0%{transform:scale(0);}50%{transform:scale(1.3);}100%{transform:scale(1);}}

/* INTRO */
.intro-screen{position:fixed;top:0;left:0;right:0;bottom:0;background:white;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;z-index:150;transition:opacity 0.4s ease;}
.intro-icon{font-size:80px;margin-bottom:24px;animation:float 3s ease-in-out infinite;}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
.intro-title{font-size:26px;font-weight:900;color:#2c2c2c;margin-bottom:8px;}
.intro-sub{font-size:15px;color:#888;line-height:1.6;margin-bottom:32px;}
.intro-time{background:${color}15;color:${color};border-radius:20px;padding:8px 16px;font-size:13px;font-weight:700;margin-bottom:32px;display:inline-block;}
.btn-start{padding:18px 48px;background:${gradient};color:white;border:none;border-radius:20px;font-size:17px;font-weight:800;cursor:pointer;box-shadow:0 12px 32px ${color}40;transition:all 0.2s;}
.btn-start:active{transform:scale(0.97);}
</style>
</head>
<body>

<!-- INTRO -->
<div class="intro-screen" id="introScreen">
  <div class="intro-icon">${q.icon}</div>
  <div class="intro-title">Bonjour ${isDemo ? 'Demo' : client.prenom} ! 👋</div>
  <div class="intro-sub">Votre avis nous aide a ameliorer<br>nos services pour vous.</div>
  <div class="intro-time">⏱️ Moins de 2 minutes</div>
  <button class="btn-start" onclick="demarrer()">Commencer →</button>
  <a href="https://bceg-reclamations-production.up.railway.app/depot-reclamation" class="rec-floating" style="position:relative;bottom:auto;right:auto;margin-top:20px;animation:none;">⚠️ Deposer une reclamation</a>
</div>

<!-- QUESTIONNAIRE -->
<div class="screen" id="mainScreen">
  <div class="header" id="mainHeader">
    <div class="header-top">
      <span class="bceg-logo">BCEG</span>
      <span class="agence-pill">${agenceNom}</span>
    </div>
    <div class="header-greeting">Enquete de satisfaction</div>
    <div class="header-name">${q.icon} ${q.titre}</div>
    ${isDemo ? '<div class="header-badge">🎯 Mode demonstration</div>' : ''}
  </div>

  <div class="progress-wrap">
    <div class="progress-info">
      <span id="progressText">Question 1 sur ${total}</span>
      <span id="progressPct">0%</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" id="progressFill" style="background:${gradient};width:0%;"></div></div>
  </div>

  <div class="content-area" id="contentArea">
    <!-- Questions generees par JS -->
  </div>

  <div class="nav-area">
    <div class="nav-btns">
      <button class="btn-back" id="btnBack" onclick="precedent()">← Retour</button>
      <button class="btn-next" id="btnNext" style="background:${gradient};" onclick="suivant()">Continuer →</button>
    </div>
  </div>
</div>

<!-- SUCCES -->
<div class="success-screen" id="successScreen">
  <div class="success-anim">🎉</div>
  <div style="font-size:26px;font-weight:900;color:#2c2c2c;margin:20px 0 8px;">Merci !</div>
  <div style="font-size:16px;color:#888;line-height:1.6;margin-bottom:24px;">Votre avis a bien ete enregistre.<br>La BCEG vous remercie de votre confiance.</div>
  <div style="font-size:40px;">😊</div>
</div>

<script>
var questions = ${questionsData};
var total = ${total};
var current = 0;
var reponses = {};
var color = '${color}';

// Generer les slides
var contentArea = document.getElementById('contentArea');

// Questions normales
questions.forEach(function(q, i) {
  var opts = [
    {v:1,e:'😞',l:'Tres insatisfait(e)'},
    {v:2,e:'😕',l:'Insatisfait(e)'},
    {v:3,e:'😐',l:'Neutre'},
    {v:4,e:'🙂',l:'Satisfait(e)'},
    {v:5,e:'😄',l:'Tres satisfait(e)'}
  ];
  var btns = opts.map(function(o) {
    return '<button type="button" class="option-btn" data-val="'+o.v+'" data-key="'+q.id+'" onclick="selectionner(this,\''+q.id+'\','+o.v+')">'
      +'<span class="option-emoji">'+o.e+'</span>'
      +'<span class="option-text">'+o.l+'</span>'
      +'<span class="option-check"><svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></span>'
      +'</button>';
  }).join('');
  
  var div = document.createElement('div');
  div.className = 'slide' + (i===0?' active':' hidden-right');
  div.id = 'slide-'+i;
  div.innerHTML = '<div class="question-card">'
    +'<span class="q-icon-big">'+q.icon+'</span>'
    +'<div class="q-label">'+q.label+'</div>'
    +'<div class="options">'+btns+'</div>'
    +'</div>';
  contentArea.appendChild(div);
});

// NPS
var npsDiv = document.createElement('div');
npsDiv.className = 'slide hidden-right';
npsDiv.id = 'slide-'+questions.length;
var npsbtns1 = [0,1,2,3,4,5].map(function(n){return '<button type="button" class="nps-btn" onclick="selNPS('+n+')">'+n+'</button>';}).join('');
var npsbtns2 = [6,7,8,9,10].map(function(n){return '<button type="button" class="nps-btn" onclick="selNPS('+n+')">'+n+'</button>';}).join('');
npsDiv.innerHTML = '<div class="question-card">'
  +'<span class="q-icon-big">🎯</span>'
  +'<div class="q-label">Sur une echelle de 0 a 10, recommanderiez-vous la BCEG a un proche ou un collegue ?</div>'
  +'<div class="nps-grid">'+npsbtns1+'</div>'
  +'<div class="nps-grid2">'+npsbtns2+'</div>'
  +'<div class="nps-labels"><span>😞 Pas du tout</span><span>😄 Certainement</span></div>'
  +'<input type="hidden" id="nps_val">'
  +'</div>';
contentArea.appendChild(npsDiv);

// Commentaire
var comDiv = document.createElement('div');
comDiv.className = 'slide hidden-right';
comDiv.id = 'slide-'+(questions.length+1);
comDiv.innerHTML = '<div class="question-card">'
  +'<span class="q-icon-big">💬</span>'
  +'<div class="q-label">Un commentaire ou une suggestion ?</div>'
  +'<span class="optional-badge">Optionnel</span>'
  +'<textarea class="comment-area" id="commentaire" placeholder="Partagez votre experience, vos suggestions..."></textarea>'
  +'</div>';
contentArea.appendChild(comDiv);

function selectionner(btn, key, val) {
  document.querySelectorAll('[data-key="'+key+'"]').forEach(function(b){ b.classList.remove('selected'); });
  btn.classList.add('selected');
  reponses[key] = val;
  document.getElementById('btnNext').disabled = false;
  setTimeout(function(){ if(current < total-1) suivant(); }, 400);
}

function selNPS(val) {
  reponses['score_nps'] = val;
  document.querySelectorAll('.nps-btn').forEach(function(b){ b.classList.remove('selected'); });
  document.querySelectorAll('.nps-btn').forEach(function(b){
    if(parseInt(b.textContent)===val) b.classList.add('selected');
  });
  document.getElementById('btnNext').disabled = false;
  setTimeout(function(){ suivant(); }, 400);
}

function updateUI() {
  var pct = Math.round((current/total)*100);
  document.getElementById('progressFill').style.width = pct+'%';
  document.getElementById('progressText').textContent = 'Question '+(current+1)+' sur '+total;
  document.getElementById('progressPct').textContent = pct+'%';
  document.getElementById('btnBack').style.display = current===0?'none':'block';
  
  if(current === total-1) {
    document.getElementById('btnNext').textContent = 'Envoyer mon avis ✓';
    document.getElementById('btnNext').style.background = 'linear-gradient(135deg,#27ae60,#1e8449)';
  } else {
    document.getElementById('btnNext').textContent = 'Continuer →';
    document.getElementById('btnNext').style.background = '${gradient}';
  }
  
  var isNPS = current === questions.length;
  var isCom = current === questions.length+1;
  document.getElementById('btnNext').disabled = !isNPS && !isCom && !reponses[questions[current]?.id];
}

function goToSlide(from, to, direction) {
  var fromEl = document.getElementById('slide-'+from);
  var toEl = document.getElementById('slide-'+to);
  if(!fromEl||!toEl) return;
  fromEl.className = 'slide '+(direction>0?'hidden-left':'hidden-right');
  toEl.className = 'slide active';
  current = to;
  updateUI();
}

function suivant() {
  if(current === total-1) { envoyer(); return; }
  if(current < total-1) goToSlide(current, current+1, 1);
}

function precedent() {
  if(current > 0) goToSlide(current, current-1, -1);
}

function demarrer() {
  var intro = document.getElementById('introScreen');
  intro.style.opacity='0';
  intro.style.pointerEvents='none';
  setTimeout(function(){ intro.style.display='none'; }, 400);
  updateUI();
}

function envoyer() {
  var btn = document.getElementById('btnNext');
  btn.textContent = 'Envoi...';
  btn.disabled = true;
  var data = {
    enquete_id: ${enqueteId},
    note_accueil: reponses['note_accueil']||3,
    note_attente: reponses['note_attente']||3,
    note_conseiller: reponses['note_conseiller']||3,
    note_traitement: reponses['note_traitement']||3,
    note_applications: reponses['note_applications']||3,
    note_globale: reponses['note_globale']||3,
    score_nps: reponses['score_nps']||7,
    commentaire: document.getElementById('commentaire')?document.getElementById('commentaire').value:''
  };
  fetch('/enquete/repondre',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
  .then(function(){document.getElementById('successScreen').classList.add('show');})
  .catch(function(){document.getElementById('successScreen').classList.add('show');});
}

updateUI();
</script>
</body></html>`;
}

// PAGE RECLAMATION (redirige vers Projet 2)
router.get('/reclamation', (req, res) => {
  res.redirect('https://bceg-reclamations-production.up.railway.app/depot-reclamation');
});

// ROUTES DE DEMONSTRATION
router.get('/demo/:type', (req, res) => {
  const type = req.params.type;
  const q = questionnaires[type] || questionnaires['default'];
  const client = { id: 'demo', nom: 'Demo', prenom: 'BCEG', operation_id: 0, agence_nom: 'BCEG' };
  res.send(genererPage(q, client, true));
});

// PAGE QUESTIONNAIRE CLIENT
router.get('/:clientId', (req, res) => {
  db.get('SELECT c.*, o.id as operation_id, o.type_operation, a.nom as agence_nom FROM clients c LEFT JOIN operations o ON o.client_id=c.id LEFT JOIN agences a ON a.id=c.agence_id WHERE c.id=?',
    [req.params.clientId], (err, client) => {
    if (!client) client = { id: req.params.clientId, nom: 'Client', prenom: 'Demo BCEG', operation_id: 0, type_operation: 'Visite en agence', agence_nom: 'BCEG' };
    const q = questionnaires[detecterType(client.type_operation)];
    res.send(genererPage(q, client, false));
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
