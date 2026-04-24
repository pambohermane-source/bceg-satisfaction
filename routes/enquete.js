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
  'credit': { titre: 'Demande de credit', icon: '💼', accent: '#d4a017', questions: [
    { id: 'note_accueil', label: "L'accueil de votre conseiller etait-il satisfaisant ?", icon: '🤝' },
    { id: 'note_attente', label: 'Le delai de traitement de votre dossier etait-il satisfaisant ?', icon: '⏱️' },
    { id: 'note_conseiller', label: 'La clarte des informations fournies etait-elle satisfaisante ?', icon: '💬' },
    { id: 'note_traitement', label: 'Le resultat obtenu correspond-il a vos attentes ?', icon: '✅' },
    { id: 'note_globale', label: 'Quelle note globale donnez-vous a cette experience ?', icon: '⭐' }
  ]},
  'ouverture': { titre: 'Ouverture de compte', icon: '🏦', accent: '#17a2d4', questions: [
    { id: 'note_accueil', label: "La qualite de l'accueil etait-elle satisfaisante ?", icon: '😊' },
    { id: 'note_attente', label: 'Le delai de traitement etait-il satisfaisant ?', icon: '⏱️' },
    { id: 'note_conseiller', label: 'Les explications sur les produits etaient-elles claires ?', icon: '💬' },
    { id: 'note_traitement', label: "La procedure d'ouverture etait-elle simple et rapide ?", icon: '⚡' },
    { id: 'note_globale', label: 'Quelle note globale donnez-vous a cette experience ?', icon: '⭐' }
  ]},
  'gestionnaire': { titre: 'Echange avec votre gestionnaire', icon: '🤝', accent: '#a017d4', questions: [
    { id: 'note_accueil', label: "Votre gestionnaire etait-il disponible et a l'ecoute ?", icon: '👂' },
    { id: 'note_conseiller', label: 'Les conseils prodigues etaient-ils pertinents ?', icon: '💡' },
    { id: 'note_traitement', label: 'Votre demande a-t-elle ete traitee de maniere satisfaisante ?', icon: '✅' },
    { id: 'note_globale', label: 'Quelle note globale donnez-vous a cet echange ?', icon: '⭐' }
  ]},
  'digital': { titre: 'Services digitaux BCEG', icon: '📱', accent: '#17d4a0', questions: [
    { id: 'note_accueil', label: 'La plateforme B-Online est-elle facile a utiliser ?', icon: '🖥️' },
    { id: 'note_attente', label: 'La plateforme est-elle disponible et rapide ?', icon: '⚡' },
    { id: 'note_conseiller', label: 'Le support en cas de probleme est-il efficace ?', icon: '🛠️' },
    { id: 'note_applications', label: 'Les fonctionnalites repondent-elles a vos besoins ?', icon: '🎯' },
    { id: 'note_globale', label: 'Quelle note globale donnez-vous aux services digitaux ?', icon: '⭐' }
  ]},
  'accueil': { titre: 'Accueil en Agence BCEG', icon: '🏦', accent: '#d4a017', questions: [
    { id: 'note_accueil', label: 'A votre arrivee, avez-vous ete recu(e) rapidement ?', icon: '⏱️', type: 'choix', options: ['Oui immediatement','Oui apres un court delai','Non, attente prolongee'] },
    { id: 'note_personnel', label: 'Le personnel d accueil etait-il aimable ?', icon: '😊', type: 'choix', options: ['Tres aimable','Aimable','Peu aimable','Pas aimable'] },
    { id: 'note_conseiller', label: 'Les informations fournies etaient-elles claires ?', icon: '💬', type: 'choix', options: ['Tres claires','Claires','Peu claires','Confuses'] },
    { id: 'note_comprehension', label: 'Le personnel a-t-il bien compris votre besoin ?', icon: '🧠', type: 'choix', options: ['Totalement','Partiellement','Pas du tout'] },
    { id: 'note_acces', label: "Comment evaluez-vous la facilite d'acces a l'agence ?", icon: '🚪', type: 'choix', options: ['Tres satisfaisant','Satisfaisant','Peu satisfaisant','Insatisfaisant'] },
    { id: 'note_confort', label: 'Comment jugez-vous la proprete et le confort des locaux ?', icon: '🏛️', type: 'choix', options: ['Tres satisfaisant','Satisfaisant','Peu satisfaisant','Insatisfaisant'] },
    { id: 'note_globale', label: 'Globalement, etes-vous satisfait(e) de l accueil a la BCEG ?', icon: '⭐', type: 'choix', options: ['Tres satisfait(e)','Satisfait(e)','Peu satisfait(e)','Insatisfait(e)'] },
    { id: 'note_recommandation', label: 'Recommanderiez-vous la BCEG a votre entourage ?', icon: '🤝', type: 'choix', options: ['Oui certainement','Oui probablement','Non probablement pas','Non certainement pas'] }
  ]},
  'default': { titre: 'Votre visite en agence', icon: '🏦', accent: '#d4a017', questions: [
    { id: 'note_accueil', label: "L'accueil a votre arrivee en agence etait-il satisfaisant ?", icon: '😊' },
    { id: 'note_attente', label: "Etes-vous satisfait(e) du temps d'attente ?", icon: '⏱️' },
    { id: 'note_conseiller', label: 'La qualite de votre conseiller etait-elle satisfaisante ?', icon: '🤝' },
    { id: 'note_traitement', label: 'Votre operation a-t-elle ete traitee rapidement et correctement ?', icon: '⚡' },
    { id: 'note_applications', label: "Etes-vous satisfait(e) des services numeriques de la BCEG ?", icon: '📱' },
    { id: 'note_globale', label: 'Quelle note globale donnez-vous a votre experience ?', icon: '⭐' }
  ]}
};

function detecterType(t) {
  if (!t) return 'default';
  t = t.toLowerCase();
  if (t.includes('credit')||t.includes('pret')) return 'credit';
  if (t.includes('ouverture')||t.includes('compte')) return 'ouverture';
  if (t.includes('gestionnaire')||t.includes('conseiller')) return 'gestionnaire';
  if (t.includes('digital')||t.includes('online')||t.includes('b-online')) return 'digital';
  if (t.includes('accueil')||t.includes('agence')) return 'accueil';
  return 'default';
}

function genererPage(q, client, isDemo) {
  var accent = q.accent;
  var total = q.questions.length + 2;
  var enqueteId = client.operation_id || 0;
  var prenom = isDemo ? 'Demo' : (client.prenom || 'Client');
  var agence = client.agence_nom || 'BCEG';
  var qDataStr = JSON.stringify(q.questions);

  var css = [
    '*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}',
    'body{font-family:Segoe UI,Arial,sans-serif;background:#0a0c0a;color:#fff;min-height:100vh;}',
    '.glow1{position:fixed;top:-30%;left:-20%;width:70%;height:70%;background:radial-gradient(ellipse,' + accent + '22 0%,transparent 65%);pointer-events:none;z-index:0;animation:gm 8s ease-in-out infinite;}',
    '.glow2{position:fixed;bottom:-20%;right:-20%;width:60%;height:60%;background:radial-gradient(ellipse,#4d553d44 0%,transparent 65%);pointer-events:none;z-index:0;animation:gm 10s ease-in-out infinite reverse;}',
    '@keyframes gm{0%,100%{transform:scale(1);}50%{transform:scale(1.2) translate(3%,3%);}}',
    '.grid{position:fixed;inset:0;background-image:linear-gradient(#ffffff03 1px,transparent 1px),linear-gradient(90deg,#ffffff03 1px,transparent 1px);background-size:48px 48px;pointer-events:none;z-index:0;}',
    '.page{max-width:480px;margin:0 auto;position:relative;z-index:1;}',
    '.intro{position:fixed;top:0;left:0;right:0;bottom:0;background:#0a0c0a;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 28px;text-align:center;z-index:50;transition:opacity 0.4s ease;}',
    '.intro .lbl{font-size:11px;font-weight:800;letter-spacing:4px;color:' + accent + ';margin-bottom:36px;opacity:0.8;}',
    '.intro .ico{font-size:72px;margin-bottom:20px;filter:drop-shadow(0 0 20px ' + accent + '88);animation:fl 3s ease-in-out infinite;}',
    '@keyframes fl{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}',
    '.intro h2{font-size:26px;font-weight:900;margin-bottom:10px;}',
    '.intro .sub{font-size:14px;color:#666;line-height:1.7;margin-bottom:8px;}',
    '.intro .timing{font-size:11px;color:' + accent + ';letter-spacing:2px;margin-bottom:36px;font-weight:700;}',
    '.btn-start{padding:16px 48px;background:transparent;color:' + accent + ';border:2px solid ' + accent + ';border-radius:40px;font-size:16px;font-weight:800;cursor:pointer;letter-spacing:1px;transition:all 0.3s;margin-bottom:20px;}',
    '.btn-start:hover{box-shadow:0 0 28px ' + accent + '66;transform:translateY(-2px);}',
    '.btn-start:active{transform:scale(0.96);}',
    '.btn-rec{display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 28px;color:#c0622a;font-size:13px;font-weight:700;text-decoration:none;border:1px solid #c0622a66;border-radius:40px;transition:all 0.3s;letter-spacing:0.5px;}',
    '.btn-rec:hover{border-color:#c0622a;background:#c0622a11;box-shadow:0 0 18px #c0622a33;}',
    '.qwrap{min-height:100vh;display:flex;flex-direction:column;}',
    '.qhdr{padding:20px 22px 14px;border-bottom:1px solid #181818;}',
    '.qhdr .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}',
    '.qhdr .logo{font-size:11px;font-weight:800;letter-spacing:3px;color:' + accent + ';opacity:0.85;}' + '.qhdr .bceg-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#4d553d;margin-left:6px;vertical-align:middle;box-shadow:0 0 8px #4d553d;}',
    '.qhdr .ag{font-size:11px;color:#383838;font-weight:600;}',
    '.prog-i{display:flex;justify-content:space-between;font-size:10px;color:#383838;font-weight:700;letter-spacing:0.5px;margin-bottom:7px;}',
    '.prog-i span:last-child{color:' + accent + ';}',
    '.prog-b{height:3px;background:#151515;border-radius:3px;overflow:hidden;}',
    '.prog-f{height:3px;border-radius:3px;background:linear-gradient(90deg,#4d553d,' + accent + ');transition:width 0.5s ease;box-shadow:0 0 6px ' + accent + '88;}',
    '.qbody{flex:1;padding:22px;overflow-y:auto;}',
    '.qcard{animation:su 0.35s ease;}',
    '@keyframes su{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}',
    '.qn{font-size:10px;color:#383838;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;}',
    '.qi{font-size:44px;margin-bottom:14px;display:block;filter:drop-shadow(0 0 14px ' + accent + '66);}',
    '.ql{font-size:19px;font-weight:800;color:#fff;line-height:1.45;margin-bottom:24px;}',
    '.opts{display:flex;flex-direction:column;gap:9px;}',
    '.opt{display:flex;align-items:center;gap:12px;padding:15px 16px;border:1px solid #1c1c1c;border-radius:14px;background:#0d100d;cursor:pointer;transition:all 0.22s;width:100%;text-align:left;}',
    '.opt:active{transform:scale(0.97);}',
    '.opt.sel{border-color:' + accent + ';box-shadow:0 0 0 1px ' + accent + ';background:#0d100d;}',
    '.opt .em{font-size:20px;flex-shrink:0;}',
    '.opt .tx{font-size:14px;font-weight:600;color:#666;transition:color 0.2s;}',
    '.opt.sel .tx{color:#fff;}',
    '.opt .ck{margin-left:auto;width:20px;height:20px;border-radius:50%;border:1px solid #2a2a2a;display:flex;align-items:center;justify-content:center;font-size:10px;color:#000;font-weight:900;flex-shrink:0;transition:all 0.2s;}',
    '.opt.sel .ck{background:' + accent + ';border-color:' + accent + ';}',
    '.nps-g{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;margin-bottom:7px;}',
    '.nps-g2{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;}',
    '.nb{padding:13px 2px;border:1px solid #1c1c1c;border-radius:11px;background:#0d100d;cursor:pointer;font-size:15px;font-weight:800;color:#444;text-align:center;transition:all 0.2s;}',
    '.nb:active{transform:scale(0.9);}',
    '.nb.sel{border-color:#4d553d;color:#a6c47a;box-shadow:0 0 14px #4d553d88;}',
    '.npsl{display:flex;justify-content:space-between;font-size:10px;color:#383838;margin-top:7px;letter-spacing:0.5px;}',
    'textarea{width:100%;padding:14px;border:1px solid #1c1c1c;border-radius:14px;font-size:14px;font-family:inherit;resize:none;min-height:120px;background:#0d100d;color:#fff;transition:all 0.2s;}',
    'textarea:focus{outline:none;border-color:' + accent + ';}',
    'textarea::placeholder{color:#2a2a2a;}',
    '.qnav{padding:14px 22px 28px;border-top:1px solid #111;}',
    '.navbtns{display:flex;gap:10px;}',
    '.bbk{flex:1;padding:15px;border:1px solid #1a1a1a;border-radius:14px;background:transparent;font-size:14px;font-weight:700;color:#383838;cursor:pointer;display:none;}',
    '.bbk:hover{color:#666;}',
    '.bnx{flex:2;padding:15px;border:2px solid ' + accent + ';border-radius:14px;background:transparent;font-size:14px;font-weight:800;color:' + accent + ';cursor:pointer;letter-spacing:0.5px;transition:all 0.3s;}',
    '.bnx:hover{box-shadow:0 0 22px ' + accent + '44;}',
    '.bnx:active{transform:scale(0.97);}',
    '.bnx:disabled{opacity:0.2;cursor:not-allowed;box-shadow:none;}',
    '.suc{display:none;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px;text-align:center;}',
    '.suc.show{display:flex;}',
    '.suc .si{font-size:72px;margin-bottom:20px;filter:drop-shadow(0 0 28px ' + accent + ');animation:pop 0.6s ease;}',
    '@keyframes pop{0%{transform:scale(0);opacity:0;}60%{transform:scale(1.2);}100%{transform:scale(1);opacity:1;}}',
    '.suc h2{font-size:28px;font-weight:900;margin-bottom:12px;}',
    '.suc p{font-size:14px;color:#555;line-height:1.7;}'
  ].join('');

  var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">'
    + '<title>Enquete BCEG</title>'
    + '<style>' + css + '</style></head><body>'
    + '<div class="grid"></div><div class="glow1"></div><div class="glow2"></div>'
    + '<div class="page">'
    + '<div class="intro" id="intro">'
    + '  <div class="lbl">BCEG &middot; SATISFACTION</div>'
    + '  <div class="ico">' + q.icon + '</div>'
    + '  <h2>Bonjour ' + prenom + ' !</h2>'
    + '  <p class="sub">Votre avis nous aide a ameliorer nos services.</p>'
    + '  <div class="timing">&#9201; &nbsp;MOINS DE 2 MINUTES</div>'
    + '  <button class="btn-start" onclick="demarrer()">COMMENCER &nbsp;&rarr;</button>'
    + '  <a href="https://bceg-reclamations-production.up.railway.app/depot-reclamation" class="btn-rec">&#9888; &nbsp;Deposer une reclamation</a>'
    + '</div>'
    + '<div class="qwrap" id="qwrap">'
    + '  <div class="qhdr">'
    + '    <div class="top"><span class="logo">BCEG</span><span class="ag">' + agence + (isDemo ? ' &middot; DEMO' : '') + '</span></div>'
    + '    <div class="prog-i"><span id="pTxt">Q1 / ' + total + '</span><span id="pPct">0%</span></div>'
    + '    <div class="prog-b"><div class="prog-f" id="pBar" style="width:0%"></div></div>'
    + '  </div>'
    + '  <div class="qbody" id="qBody"></div>'
    + '  <div class="qnav">'
    + '    <div class="navbtns">'
    + '      <button class="bbk" id="bbk" onclick="precedent()">&#8592; Retour</button>'
    + '      <button class="bnx" id="bnx" disabled onclick="suivant()">CONTINUER &nbsp;&rarr;</button>'
    + '    </div>'
    + '  </div>'
    + '</div>'
    + '<div class="suc" id="suc">'
    + '  <div class="si">&#10022;</div>'
    + '  <h2>Merci !</h2>'
    + '  <p>Votre avis a bien ete enregistre.<br>La BCEG vous remercie de votre confiance.</p>'
    + '</div>'
    + '</div>'
    + '<script>'
    + 'var QS=' + qDataStr + ';'
    + 'var TOTAL=' + total + ';'
    + 'var EID=' + enqueteId + ';'
    + 'var CUR=0;'
    + 'var REP={};'
    + 'var OPT=['
    + '  {v:1,e:"Tres insatisfait",i:"1"},'
    + '  {v:2,e:"Insatisfait",i:"2"},'
    + '  {v:3,e:"Neutre",i:"3"},'
    + '  {v:4,e:"Satisfait",i:"4"},'
    + '  {v:5,e:"Tres satisfait",i:"5"}'
    + '];'
    + 'function demarrer(){'
    + '  var intro=document.getElementById("intro");'
    + '  intro.style.opacity="0";'
    + '  intro.style.pointerEvents="none";'
    + '  setTimeout(function(){intro.style.display="none";},400);'
    + '  renderQ();'
    + '}'
    + 'function renderQ(){'
    + '  var pct=Math.round(((CUR+1)/TOTAL)*100);'
    + '  document.getElementById("pBar").style.width=pct+"%";'
    + '  document.getElementById("pTxt").textContent="Q"+(CUR+1)+" / "+TOTAL;'
    + '  document.getElementById("pPct").textContent=pct+"%";'
    + '  document.getElementById("bbk").style.display=CUR>0?"block":"none";'
    + '  document.getElementById("bnx").disabled=true;'
    + '  document.getElementById("bnx").textContent=CUR===TOTAL-1?"ENVOYER MON AVIS":"CONTINUER";'
    + '  var html="";'
    + '  if(CUR<QS.length){'
    + '    var q=QS[CUR];'
    + '    var btns=OPT.map(function(o){'
    + '      var s=REP[q.id]===o.v?" sel":"";'
    + '      return "<button class=\\"opt"+s+"\\" onclick=\\"sel(this,\'"+ q.id +"\',"+ o.v +")\\">"+"<span class=\\"em\\">"+(o.i)+"</span>"+"<span class=\\"tx\\">"+(o.e)+"</span>"+"<span class=\\"ck\\">"+(s?"&#10003;":"")+"</span></button>";'
    + '    }).join("");'
    + '    html="<div class=\\"qcard\\"><div class=\\"qn\\">Q"+(CUR+1)+" / "+TOTAL+"</div><div class=\\"qi\\">"+(q.icon)+"</div><div class=\\"ql\\">"+(q.label)+"</div><div class=\\"opts\\">"+btns+"</div></div>";'
    + '    if(REP[q.id])document.getElementById("bnx").disabled=false;'
    + '  }else if(CUR===QS.length){'
    + '    var nb=[0,1,2,3,4,5,6,7,8,9,10].map(function(n){var s=REP.nps===n?" sel":"";return"<button class=\\"nb"+s+"\\" onclick=\\"selN("+n+")\\">"+ n +"</button>";});'
    + '    html="<div class=\\"qcard\\"><div class=\\"qn\\">Q"+(CUR+1)+" / "+TOTAL+"</div><div class=\\"qi\\">&#127919;</div><div class=\\"ql\\">Sur une echelle de 0 a 10, recommanderiez-vous la BCEG a un proche ?</div><div class=\\"nps-g\\">"+ nb.slice(0,6).join("") +"</div><div class=\\"nps-g2\\">"+ nb.slice(6).join("") +"</div><div class=\\"npsl\\"><span>Pas du tout</span><span>Certainement</span></div></div>";'
    + '    if(REP.nps!==undefined)document.getElementById("bnx").disabled=false;'
    + '  }else{'
    + '    html="<div class=\\"qcard\\"><div class=\\"qn\\">Q"+(CUR+1)+" / "+TOTAL+" &middot; OPTIONNEL</div><div class=\\"qi\\">&#128172;</div><div class=\\"ql\\">Un commentaire ou une suggestion ?</div><textarea id=\\"com\\" placeholder=\\"Partagez votre experience...\\"></textarea></div>";'
    + '    document.getElementById("bnx").disabled=false;'
    + '  }'
    + '  document.getElementById("qBody").innerHTML=html;'
    + '}'
    + 'function sel(btn,key,val){'
    + '  REP[key]=val;'
    + '  document.querySelectorAll(".opt").forEach(function(b){b.classList.remove("sel");b.querySelector(".ck").innerHTML="";});'
    + '  btn.classList.add("sel");btn.querySelector(".ck").innerHTML="&#10003;";'
    + '  document.getElementById("bnx").disabled=false;'
    + '  setTimeout(function(){if(CUR<TOTAL-1)suivant();},350);'
    + '}'
    + 'function selN(n){'
    + '  REP.nps=n;'
    + '  document.querySelectorAll(".nb").forEach(function(b){b.classList.toggle("sel",parseInt(b.textContent)===n);});'
    + '  document.getElementById("bnx").disabled=false;'
    + '  setTimeout(suivant,350);'
    + '}'
    + 'function suivant(){'
    + '  if(CUR===TOTAL-1){envoyer();return;}'
    + '  var c=document.getElementById("com");if(c)REP.com=c.value;'
    + '  CUR++;renderQ();'
    + '}'
    + 'function precedent(){if(CUR>0){CUR--;renderQ();}}'
    + 'function envoyer(){'
    + '  var c=document.getElementById("com");if(c)REP.com=c.value;'
    + '  var btn=document.getElementById("bnx");'
    + '  btn.textContent="ENVOI...";btn.disabled=true;'
    + '  fetch("/enquete/repondre",{method:"POST",headers:{"Content-Type":"application/json"},'
    + '    body:JSON.stringify({enquete_id:EID,note_accueil:REP.note_accueil||3,note_attente:REP.note_attente||3,note_conseiller:REP.note_conseiller||3,note_traitement:REP.note_traitement||3,note_applications:REP.note_applications||3,note_globale:REP.note_globale||3,score_nps:REP.nps!==undefined?REP.nps:7,commentaire:REP.com||""})})'
    + '  .then(function(){document.getElementById("qwrap").style.display="none";document.getElementById("suc").classList.add("show");})'
    + '  .catch(function(){document.getElementById("qwrap").style.display="none";document.getElementById("suc").classList.add("show");});'
    + '}'
    + '</' + 'script>'
    + '</body></html>';

  return html;
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
