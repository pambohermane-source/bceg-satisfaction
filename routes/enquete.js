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
const upload = multer({ storage, limits: { fileSize: 5*1024*1024 } });

const questionnaires = {
  'credit': { titre: 'Demande de credit', icon: '💼', accent: '#f5c842', questions: [
    { id: 'note_accueil', label: "Comment evaluez-vous l'accueil de votre conseiller ?", icon: '🤝' },
    { id: 'note_attente', label: "Le delai de traitement de votre dossier etait-il satisfaisant ?", icon: '⏱️' },
    { id: 'note_conseiller', label: "La clarte des informations fournies etait-elle satisfaisante ?", icon: '💬' },
    { id: 'note_traitement', label: "Le resultat obtenu correspond-il a vos attentes ?", icon: '✅' },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a cette experience ?", icon: '⭐' }
  ]},
  'ouverture': { titre: 'Ouverture de compte', icon: '🏦', accent: '#42c8f5', questions: [
    { id: 'note_accueil', label: "Comment evaluez-vous la qualite de l'accueil ?", icon: '😊' },
    { id: 'note_attente', label: "Le delai de traitement de votre dossier etait-il satisfaisant ?", icon: '⏱️' },
    { id: 'note_conseiller', label: "Les explications sur les produits etaient-elles claires ?", icon: '💬' },
    { id: 'note_traitement', label: "La procedure d'ouverture etait-elle simple et rapide ?", icon: '⚡' },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a cette experience ?", icon: '⭐' }
  ]},
  'gestionnaire': { titre: 'Echange avec votre gestionnaire', icon: '🤝', accent: '#c842f5', questions: [
    { id: 'note_accueil', label: "Votre gestionnaire etait-il disponible et a l'ecoute ?", icon: '👂' },
    { id: 'note_conseiller', label: "Les conseils prodigues etaient-ils pertinents et adaptes ?", icon: '💡' },
    { id: 'note_traitement', label: "Votre demande a-t-elle ete traitee de maniere satisfaisante ?", icon: '✅' },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a cet echange ?", icon: '⭐' }
  ]},
  'digital': { titre: 'Services digitaux BCEG', icon: '📱', accent: '#42f5a7', questions: [
    { id: 'note_accueil', label: "La plateforme B-Online est-elle facile a utiliser ?", icon: '🖥️' },
    { id: 'note_attente', label: "La plateforme est-elle disponible et rapide ?", icon: '⚡' },
    { id: 'note_conseiller', label: "En cas de probleme, le support etait-il efficace ?", icon: '🛠️' },
    { id: 'note_applications', label: "Les fonctionnalites repondent-elles a vos besoins ?", icon: '🎯' },
    { id: 'note_globale', label: "Quelle note globale donnez-vous aux services digitaux ?", icon: '⭐' }
  ]},
  'default': { titre: 'Votre visite en agence', icon: '🏦', accent: '#f5c842', questions: [
    { id: 'note_accueil', label: "Comment evaluez-vous l'accueil a votre arrivee en agence ?", icon: '😊' },
    { id: 'note_attente', label: "Etes-vous satisfait(e) du temps d'attente ?", icon: '⏱️' },
    { id: 'note_conseiller', label: "Comment evaluez-vous la qualite de votre conseiller ?", icon: '🤝' },
    { id: 'note_traitement', label: "Votre operation a-t-elle ete traitee rapidement ?", icon: '⚡' },
    { id: 'note_applications', label: "Etes-vous satisfait(e) des services numeriques de la BCEG ?", icon: '📱' },
    { id: 'note_globale', label: "Quelle note globale donnez-vous a votre experience ?", icon: '⭐' }
  ]}
};

function detecterType(t) {
  if (!t) return 'default';
  t = t.toLowerCase();
  if (t.includes('credit')||t.includes('pret')) return 'credit';
  if (t.includes('ouverture')||t.includes('compte')) return 'ouverture';
  if (t.includes('gestionnaire')||t.includes('conseiller')) return 'gestionnaire';
  if (t.includes('digital')||t.includes('online')||t.includes('b-online')) return 'digital';
  return 'default';
}

function genererPage(q, client, isDemo) {
  var accent = q.accent;
  var total = q.questions.length + 2;
  var enqueteId = client.operation_id || 0;
  var prenom = isDemo ? 'Demo' : (client.prenom || 'Client');
  var agence = client.agence_nom || 'BCEG';
  var qData = JSON.stringify(q.questions.map(function(quest) {
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
body{font-family:'Segoe UI',Arial,sans-serif;background:#0a0c0a;color:#fff;min-height:100vh;overflow-x:hidden;}

/* PARTICULES DE FOND */
.bg-glow{position:fixed;top:-20%;left:-20%;width:60%;height:60%;background:radial-gradient(ellipse,${accent}18 0%,transparent 70%);pointer-events:none;z-index:0;animation:glowMove 8s ease-in-out infinite;}
.bg-glow2{position:fixed;bottom:-20%;right:-20%;width:50%;height:50%;background:radial-gradient(ellipse,#4d553d22 0%,transparent 70%);pointer-events:none;z-index:0;animation:glowMove 10s ease-in-out infinite reverse;}
@keyframes glowMove{0%,100%{transform:scale(1) translate(0,0);}50%{transform:scale(1.2) translate(5%,5%);}}

/* PAGE */
.page{max-width:480px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;position:relative;z-index:1;}

/* INTRO */
.intro{position:fixed;top:0;left:0;right:0;bottom:0;background:#0a0c0a;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;z-index:50;transition:opacity 0.4s ease;}
.intro-logo{font-size:13px;font-weight:800;letter-spacing:4px;color:${accent};opacity:0.8;margin-bottom:40px;}
.intro-icon{font-size:72px;margin-bottom:24px;filter:drop-shadow(0 0 24px ${accent}88);animation:float 3s ease-in-out infinite;}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);}}
.intro-title{font-size:28px;font-weight:900;color:#fff;margin-bottom:10px;line-height:1.2;}
.intro-sub{font-size:15px;color:#888;line-height:1.7;margin-bottom:8px;}
.intro-time{font-size:12px;color:${accent};font-weight:700;letter-spacing:1px;margin-bottom:40px;opacity:0.9;}
.btn-start{padding:18px 52px;background:transparent;color:${accent};border:2px solid ${accent};border-radius:40px;font-size:17px;font-weight:800;cursor:pointer;letter-spacing:1px;transition:all 0.3s;position:relative;overflow:hidden;}
.btn-start::before{content:'';position:absolute;top:50%;left:50%;width:0;height:0;background:${accent}22;border-radius:50%;transform:translate(-50%,-50%);transition:width 0.5s,height 0.5s;}
.btn-start:hover::before,.btn-start:active::before{width:300px;height:300px;}
.btn-start:hover{box-shadow:0 0 32px ${accent}66;transform:translateY(-2px);}
.intro-rec{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:20px;padding:14px 32px;color:#c0622a;font-size:14px;font-weight:700;text-decoration:none;border:1px solid #c0622a44;border-radius:40px;transition:all 0.3s;letter-spacing:0.5px;}
.intro-rec:hover{border-color:#c0622a;background:#c0622a11;box-shadow:0 0 20px #c0622a33;}

/* HEADER */
.q-header{padding:24px 24px 16px;border-bottom:1px solid #1a1a1a;}
.q-header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.q-logo{font-size:12px;font-weight:800;letter-spacing:3px;color:${accent};opacity:0.8;}
.q-agence{font-size:11px;color:#444;font-weight:600;}

/* PROGRESS */
.prog-wrap{padding:0 24px 16px;}
.prog-info{display:flex;justify-content:space-between;font-size:11px;color:#444;font-weight:700;letter-spacing:0.5px;margin-bottom:8px;}
.prog-info span:last-child{color:${accent};}
.prog-bar{height:3px;background:#1a1a1a;border-radius:3px;overflow:hidden;}
.prog-fill{height:3px;border-radius:3px;background:linear-gradient(90deg,#4d553d,${accent});transition:width 0.5s cubic-bezier(0.4,0,0.2,1);box-shadow:0 0 8px ${accent}88;}

/* BODY */
.q-body{flex:1;padding:24px;overflow-y:auto;}
.q-card{animation:slideUp 0.4s cubic-bezier(0.4,0,0.2,1);}
@keyframes slideUp{from{opacity:0;transform:translateY(30px);}to{opacity:1;transform:translateY(0);}}
.q-num{font-size:11px;color:#444;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;}
.q-icon{font-size:48px;margin-bottom:16px;display:block;filter:drop-shadow(0 0 16px ${accent}66);}
.q-label{font-size:20px;font-weight:800;color:#fff;line-height:1.4;margin-bottom:28px;}

/* OPTIONS */
.opts{display:flex;flex-direction:column;gap:10px;}
.opt{display:flex;align-items:center;gap:14px;padding:16px 18px;border:1px solid #1e1e1e;border-radius:16px;background:#0f120f;cursor:pointer;transition:all 0.25s;width:100%;text-align:left;position:relative;overflow:hidden;}
.opt::before{content:'';position:absolute;inset:0;background:${accent}08;opacity:0;transition:opacity 0.2s;}
.opt:hover::before{opacity:1;}
.opt:active{transform:scale(0.97);}
.opt.sel{border-color:${accent};background:#0f120f;box-shadow:0 0 0 1px ${accent},inset 0 0 20px ${accent}08;}
.opt .em{font-size:22px;flex-shrink:0;}
.opt .tx{font-size:14px;font-weight:600;color:#aaa;transition:color 0.2s;}
.opt.sel .tx{color:#fff;}
.opt .ck{margin-left:auto;width:22px;height:22px;border-radius:50%;border:1px solid #333;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;transition:all 0.2s;}
.opt.sel .ck{background:${accent};border-color:${accent};color:#000;font-weight:900;}

/* NPS */
.nps-wrap{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:8px;}
.nps-wrap2{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;}
.nps-b{padding:14px 2px;border:1px solid #1e1e1e;border-radius:12px;background:#0f120f;cursor:pointer;font-size:16px;font-weight:800;color:#555;text-align:center;transition:all 0.2s;}
.nps-b:hover{border-color:${accent}66;color:#fff;}
.nps-b:active{transform:scale(0.92);}
.nps-b.sel{border-color:${accent};color:${accent};box-shadow:0 0 16px ${accent}44;}
.nps-lbl{display:flex;justify-content:space-between;font-size:10px;color:#444;margin-top:8px;letter-spacing:0.5px;}

/* COMMENTAIRE */
textarea{width:100%;padding:16px;border:1px solid #1e1e1e;border-radius:16px;font-size:14px;font-family:inherit;resize:none;min-height:120px;background:#0f120f;color:#fff;transition:all 0.2s;}
textarea:focus{outline:none;border-color:${accent};box-shadow:0 0 0 1px ${accent}44;}
textarea::placeholder{color:#333;}
.opt-label{font-size:11px;color:#444;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;display:block;}

/* NAVIGATION */
.q-nav{padding:16px 24px 32px;border-top:1px solid #111;}
.nav-btns{display:flex;gap:10px;}
.btn-back{flex:1;padding:16px;border:1px solid #1e1e1e;border-radius:16px;background:transparent;font-size:14px;font-weight:700;color:#444;cursor:pointer;transition:all 0.2s;display:none;}
.btn-back:hover{border-color:#333;color:#888;}
.btn-next{flex:2;padding:16px;border:2px solid ${accent};border-radius:16px;background:transparent;font-size:15px;font-weight:800;color:${accent};cursor:pointer;letter-spacing:0.5px;transition:all 0.3s;position:relative;overflow:hidden;}
.btn-next::after{content:'';position:absolute;inset:0;background:${accent};opacity:0;transition:opacity 0.3s;}
.btn-next:hover::after{opacity:0.08;}
.btn-next:hover{box-shadow:0 0 24px ${accent}44;}
.btn-next:active{transform:scale(0.97);}
.btn-next:disabled{opacity:0.2;cursor:not-allowed;box-shadow:none;}

/* SUCCES */
.success{display:none;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px;text-align:center;}
.success.show{display:flex;}
.success-icon{font-size:80px;margin-bottom:24px;animation:pop 0.6s ease;filter:drop-shadow(0 0 32px ${accent});}
@keyframes pop{0%{transform:scale(0);opacity:0;}60%{transform:scale(1.2);}100%{transform:scale(1);opacity:1;}}
.success-title{font-size:28px;font-weight:900;color:#fff;margin-bottom:12px;}
.success-sub{font-size:15px;color:#555;line-height:1.7;}

/* GRID LINES DECOR */
.grid-decor{position:fixed;inset:0;background-image:linear-gradient(#ffffff04 1px,transparent 1px),linear-gradient(90deg,#ffffff04 1px,transparent 1px);background-size:60px 60px;pointer-events:none;z-index:0;}
</style>
</head>
<body>
<div class="grid-decor"></div>
<div class="bg-glow"></div>
<div class="bg-glow2"></div>

<div class="page">

  <!-- INTRO -->
  <div class="intro" id="intro">
    <div class="intro-logo">BCEG · SATISFACTION</div>
    <div class="intro-icon">${q.icon}</div>
    <div class="intro-title">Bonjour ${prenom} 👋</div>
    <p class="intro-sub">Votre avis nous aide a ameliorer<br>nos services pour vous.</p>
    <div class="intro-time">⏱ &nbsp;MOINS DE 2 MINUTES</div>
    <button class="btn-start" onclick="demarrer()">COMMENCER &nbsp;→</button>
    <a href="https://bceg-reclamations-production.up.railway.app/depot-reclamation" class="intro-rec">⚠ Deposer une reclamation</a>
  </div>

  <!-- QUESTIONNAIRE -->
  <div id="questionnaire" style="flex:1;flex-direction:column;min-height:100vh;display:flex;">
    <div class="q-header">
      <div class="q-header-top">
        <span class="q-logo">BCEG</span>
        <span class="q-agence">${agence}${isDemo ? ' · DEMO' : ''}</span>
      </div>
      <div class="prog-wrap" style="padding:0;">
        <div class="prog-info">
          <span id="progTxt">QUESTION 1 SUR ${total}</span>
          <span id="progPct">0%</span>
        </div>
        <div class="prog-bar"><div class="prog-fill" id="progFill" style="width:0%"></div></div>
      </div>
    </div>

    <div class="q-body" id="qBody"></div>

    <div class="q-nav">
      <div class="nav-btns">
        <button class="btn-back" id="btnBack" onclick="precedent()">← Retour</button>
        <button class="btn-next" id="btnNext" disabled onclick="suivant()">Continuer →</button>
      </div>
    </div>
  </div>

  <!-- SUCCES -->
  <div class="success" id="success">
    <div class="success-icon">✦</div>
    <div class="success-title">Merci !</div>
    <div class="success-sub">Votre avis a bien ete enregistre.<br>La BCEG vous remercie<br>de votre confiance.</div>
  </div>

</div>

<script>
var qs = ${qData};
var total = ${total};
var cur = 0;
var rep = {};
var opts = [
  {v:1,e:'😞',l:'Tres insatisfait'},
  {v:2,e:'😕',l:'Insatisfait'},
  {v:3,e:'😐',l:'Neutre'},
  {v:4,e:'🙂',l:'Satisfait'},
  {v:5,e:'😄',l:'Tres satisfait'}
];

function demarrer() {
  var intro = document.getElementById('intro');
  intro.style.opacity = '0';
  intro.style.pointerEvents = 'none';
  setTimeout(function() { intro.style.display = 'none'; }, 400);
  renderQ();
}

function renderQ() {
  var body = document.getElementById('qBody');
  var pct = Math.round(((cur+1)/total)*100);
  document.getElementById('progFill').style.width = pct + '%';
  document.getElementById('progTxt').textContent = 'QUESTION ' + (cur+1) + ' SUR ' + total;
  document.getElementById('progPct').textContent = pct + '%';
  document.getElementById('btnBack').style.display = cur > 0 ? 'block' : 'none';
  document.getElementById('btnNext').disabled = true;
  document.getElementById('btnNext').textContent = cur === total-1 ? 'ENVOYER MON AVIS  ✓' : 'CONTINUER  →';

  var html = '';
  if (cur < qs.length) {
    var q = qs[cur];
    var btns = opts.map(function(o) {
      var s = rep[q.id] === o.v ? ' sel' : '';
      return '<button class="opt' + s + '" onclick="selQ(this,\'' + q.id + '\',' + o.v + ')">'
        + '<span class="em">' + o.e + '</span>'
        + '<span class="tx">' + o.l + '</span>'
        + '<span class="ck">' + (s ? '✓' : '') + '</span>'
        + '</button>';
    }).join('');
    html = '<div class="q-card">'
      + '<div class="q-num">Q' + (cur+1) + ' &nbsp;/&nbsp; ' + total + '</div>'
      + '<span class="q-icon">' + q.icon + '</span>'
      + '<div class="q-label">' + q.label + '</div>'
      + '<div class="opts">' + btns + '</div>'
      + '</div>';
    if (rep[q.id]) document.getElementById('btnNext').disabled = false;

  } else if (cur === qs.length) {
    var nbtns = [0,1,2,3,4,5,6,7,8,9,10].map(function(n) {
      var s = rep.nps === n ? ' sel' : '';
      return '<button class="nps-b' + s + '" onclick="selNPS(' + n + ')">' + n + '</button>';
    });
    html = '<div class="q-card">'
      + '<div class="q-num">Q' + (cur+1) + ' &nbsp;/&nbsp; ' + total + '</div>'
      + '<span class="q-icon">🎯</span>'
      + '<div class="q-label">Sur une echelle de 0 a 10, recommanderiez-vous la BCEG a un proche ?</div>'
      + '<div class="nps-wrap">' + nbtns.slice(0,6).join('') + '</div>'
      + '<div class="nps-wrap2">' + nbtns.slice(6).join('') + '</div>'
      + '<div class="nps-lbl"><span>😞 PAS DU TOUT</span><span>CERTAINEMENT 😄</span></div>'
      + '</div>';
    if (rep.nps !== undefined) document.getElementById('btnNext').disabled = false;

  } else {
    html = '<div class="q-card">'
      + '<div class="q-num">Q' + (cur+1) + ' &nbsp;/&nbsp; ' + total + ' &nbsp;·&nbsp; OPTIONNEL</div>'
      + '<span class="q-icon">💬</span>'
      + '<div class="q-label">Un commentaire ou une suggestion ?</div>'
      + '<textarea id="com" placeholder="Partagez votre experience..."></textarea>'
      + '</div>';
    document.getElementById('btnNext').disabled = false;
  }

  body.innerHTML = html;
  body.scrollTop = 0;
}

function selQ(btn, key, val) {
  rep[key] = val;
  document.querySelectorAll('.opt').forEach(function(b) {
    b.classList.remove('sel');
    b.querySelector('.ck').textContent = '';
  });
  btn.classList.add('sel');
  btn.querySelector('.ck').textContent = '✓';
  document.getElementById('btnNext').disabled = false;
  setTimeout(function() { if (cur < total-1) suivant(); }, 350);
}

function selNPS(n) {
  rep.nps = n;
  document.querySelectorAll('.nps-b').forEach(function(b) {
    b.classList.toggle('sel', parseInt(b.textContent) === n);
  });
  document.getElementById('btnNext').disabled = false;
  setTimeout(suivant, 350);
}

function suivant() {
  if (cur === total-1) { envoyer(); return; }
  var c = document.getElementById('com');
  if (c) rep.com = c.value;
  cur++;
  renderQ();
}

function precedent() {
  if (cur > 0) { cur--; renderQ(); }
}

function envoyer() {
  var c = document.getElementById('com');
  if (c) rep.com = c.value;
  var btn = document.getElementById('btnNext');
  btn.textContent = 'ENVOI...';
  btn.disabled = true;
  fetch('/enquete/repondre', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      enquete_id: ${enqueteId},
      note_accueil: rep.note_accueil||3,
      note_attente: rep.note_attente||3,
      note_conseiller: rep.note_conseiller||3,
      note_traitement: rep.note_traitement||3,
      note_applications: rep.note_applications||3,
      note_globale: rep.note_globale||3,
      score_nps: rep.nps !== undefined ? rep.nps : 7,
      commentaire: rep.com||''
    })
  })
  .then(function() {
    document.getElementById('questionnaire').style.display = 'none';
    document.getElementById('success').classList.add('show');
  })
  .catch(function() {
    document.getElementById('questionnaire').style.display = 'none';
    document.getElementById('success').classList.add('show');
  });
}
</script>
</body></html>`;
}

router.get('/reclamation', (req, res) => {
  res.redirect('https://bceg-reclamations-production.up.railway.app/depot-reclamation');
});

router.get('/demo/:type', (req, res) => {
  const type = req.params.type;
  const q = questionnaires[type] || questionnaires['default'];
  const client = { prenom: 'Demo', nom: '', operation_id: 0, agence_nom: 'BCEG' };
  res.send(genererPage(q, client, true));
});

router.get('/:clientId', (req, res) => {
  db.get('SELECT c.*, o.id as operation_id, o.type_operation, a.nom as agence_nom FROM clients c LEFT JOIN operations o ON o.client_id=c.id LEFT JOIN agences a ON a.id=c.agence_id WHERE c.id=?',
    [req.params.clientId], (err, client) => {
    if (!client) client = { prenom: 'Demo', nom: '', operation_id: 0, type_operation: 'Visite en agence', agence_nom: 'BCEG' };
    const q = questionnaires[detecterType(client.type_operation)];
    res.send(genererPage(q, client, false));
  });
});

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
