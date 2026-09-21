const express = require('express');
const router = express.Router();
const db = require('../models/database');

// ─────────────────────────────────────────────────────────────────
// QUESTIONNAIRE UNIQUE — validé DG (source : Qualité / Marelle)
// "Enquête de satisfaction clients : évaluation du parcours client"
//
// Remplace les anciens questionnaires multiples (credit, ouverture,
// gestionnaire, digital, accueil). Un seul parcours pour tous les
// clients, quel que soit le type d'opération.
//
// Types de questions gérés :
//  - 'scale5'  : échelle 1 à 5, avec libellés par défaut
//                (Très insatisfait ... Très satisfait), stocke un INTEGER
//  - 'choice'  : liste d'options texte, stocke la chaîne choisie
//  - 'scale10' : échelle 0 à 10 façon NPS, stocke un INTEGER
//  - 'textarea': texte libre, optionnel
//
// NOTE : la question 7.2 (recommandation) est implémentée en 0-10
// (échelle NPS classique, comme le score_nps déjà utilisé dans
// l'app) — à confirmer avec la Qualité si ce n'est pas la bonne
// échelle, le document source ne montrant que les 2 valeurs extrêmes.
// ─────────────────────────────────────────────────────────────────

const SCALE5_DEFAULT = ['Très insatisfait', 'Insatisfait', 'Moyennement satisfait', 'Satisfait', 'Très satisfait'];

const QUESTIONS = [
  // 1. PROFIL DU CLIENT
  { id: 'secteur_activite', section: 'Profil', icon: '👤', type: 'choice',
    label: "Quel est votre secteur d'activité ?",
    options: ['Particulier / Fonction publique / Secteur privé', 'Profession libérale', 'Entrepreneur / Commerçant', 'Entreprise', 'Agriculture / Élevage / Pêche', 'Autre'] },
  { id: 'anciennete_client', section: 'Profil', icon: '📅', type: 'choice',
    label: 'Depuis combien de temps êtes-vous client de la BCEG ?',
    options: ['Moins de 6 mois', '6 mois à 1 an', '1 an et plus'] },

  // 2. DERNIÈRE EXPÉRIENCE
  { id: 'objet_demarche', section: 'Votre dernière expérience', icon: '📋', type: 'choice',
    label: "Quel était l'objet principal de votre dernière démarche auprès de la BCEG ?",
    options: ['Ouverture de compte', 'Demande de crédit / financement', 'Gestion de compte', 'Opération bancaire', "Demande d'information / conseil", 'Réclamation / difficulté', 'Autre'] },
  { id: 'canal_demarche', section: 'Votre dernière expérience', icon: '📞', type: 'choice',
    label: 'Comment avez-vous effectué votre démarche ?',
    options: ['En agence', 'Par téléphone', 'Par e-mail', 'Autre'] },

  // 3. ACCUEIL ET PREMIÈRE PRISE EN CHARGE
  { id: 'note_qualite_accueil', section: 'Accueil', icon: '😊', type: 'scale5',
    label: "Comment évaluez-vous la qualité de l'accueil ?" },
  { id: 'note_courtoisie', section: 'Accueil', icon: '🤝', type: 'scale5',
    label: 'Comment évaluez-vous la courtoisie du personnel ?' },
  { id: 'note_disponibilite', section: 'Accueil', icon: '🕑', type: 'scale5',
    label: 'Comment évaluez-vous la disponibilité du personnel ?' },
  { id: 'note_rapidite_prise_en_charge', section: 'Accueil', icon: '⚡', type: 'scale5',
    label: 'Comment évaluez-vous la rapidité de votre prise en charge ?' },
  { id: 'note_orientation', section: 'Accueil', icon: '🧭', type: 'scale5',
    label: 'Comment évaluez-vous votre orientation vers le bon interlocuteur ?' },
  { id: 'temps_attente', section: 'Accueil', icon: '⏱️', type: 'choice',
    label: "Comment avez-vous trouvé le temps d'attente ?",
    options: ['Très satisfaisant', 'Satisfaisant', 'Acceptable', 'Long', 'Très long'] },

  // 4. PRISE EN CHARGE PAR LE CONSEILLER
  { id: 'conseiller_joignable', section: 'Votre conseiller', icon: '📱', type: 'choice',
    label: 'Avez-vous facilement pu joindre votre conseiller lorsque vous en aviez besoin ?',
    options: ['Toujours', 'Souvent', 'Parfois', 'Rarement', 'Jamais'] },
  { id: 'conseiller_ecoute', section: 'Votre conseiller', icon: '👂', type: 'choice',
    label: 'Votre conseiller a-t-il pris le temps d\'écouter votre besoin ?',
    options: ['Pas du tout', 'Peu', 'Moyennement', 'Oui', 'Tout à fait'] },
  { id: 'clarte_informations', section: 'Votre conseiller', icon: '💬', type: 'scale5',
    label: 'Les informations et documents demandés vous ont-ils été clairement expliqués ?' },
  { id: 'traite_premier_contact', section: 'Votre conseiller', icon: '✅', type: 'choice',
    label: 'Votre demande a-t-elle été traitée dès le premier contact ?',
    options: ['Oui', 'Partiellement', 'Non'] },
  { id: 'raison_non_traite', section: 'Votre conseiller', icon: '✏️', type: 'textarea', optional: true,
    label: 'Si non, pourquoi ?',
    skip: (rep) => rep.traite_premier_contact !== 'Non' },
  { id: 'informe_avancement', section: 'Votre conseiller', icon: '📨', type: 'choice',
    label: "Avez-vous été suffisamment informé de l'état d'avancement de votre demande ?",
    options: ['Toujours', 'Souvent', 'Parfois', 'Rarement', 'Jamais'] },

  // 5. TRAITEMENT DE LA DEMANDE
  { id: 'delai_traitement', section: 'Traitement de votre demande', icon: '⏳', type: 'scale5',
    label: 'Comment évaluez-vous le délai de traitement de votre demande ?',
    scaleLabels: ['Très insatisfaisant', 'Insatisfaisant', 'Acceptable', 'Satisfaisant', 'Très satisfaisant'] },
  { id: 'delai_respecte', section: 'Traitement de votre demande', icon: '📆', type: 'choice',
    label: 'Le délai annoncé initialement a-t-il été respecté ?',
    options: ['Oui', 'Partiellement', 'Non', "Aucun délai ne m'a été communiqué"] },
  { id: 'reponse_adaptee', section: 'Traitement de votre demande', icon: '🎯', type: 'choice',
    label: 'La réponse apportée correspondait-elle à votre besoin initial ?',
    options: ['Tout à fait', 'Plutôt oui', 'Partiellement', 'Non', 'Pas du tout'] },

  // 6. SUIVI
  { id: 'suivi_apres_service', section: 'Suivi', icon: '🔄', type: 'choice',
    label: 'Après le traitement de votre demande, votre conseiller a-t-il effectué un suivi ?',
    options: ['Oui, systématiquement', 'Oui, parfois', 'Rarement', 'Jamais'] },

  // 7. SATISFACTION GLOBALE
  { id: 'note_globale', section: 'Satisfaction globale', icon: '⭐', type: 'scale5',
    label: 'Globalement, quel est votre niveau de satisfaction concernant votre dernière expérience avec la BCEG ?' },
  { id: 'score_nps', section: 'Satisfaction globale', icon: '🎯', type: 'scale10',
    label: 'Quelle est la probabilité que vous recommandiez la BCEG à votre entourage ?' },

  // 8. AVIS LIBRE
  { id: 'commentaire', section: 'Votre avis', icon: '💬', type: 'textarea', optional: true,
    label: 'Avez-vous une autre suggestion ou remarque ?' }
];

const ACCENT = '#d4a017';

function questionsActives(rep) {
  return QUESTIONS.filter(q => !q.skip || !q.skip(rep));
}

function genererPage(client, isDemo) {
  var enqueteId = client.operation_id || 0;
  var prenom = isDemo ? 'Demo' : (client.prenom || 'Client');
  var agence = client.agence_nom || 'BCEG';
  var qDataStr = JSON.stringify(QUESTIONS);

  var css = [
    '*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}',
    'body{font-family:Segoe UI,Arial,sans-serif;background:#0a0c0a;color:#fff;min-height:100vh;}',
    '.glow1{position:fixed;top:-30%;left:-20%;width:70%;height:70%;background:radial-gradient(ellipse,' + ACCENT + '22 0%,transparent 65%);pointer-events:none;z-index:0;animation:gm 8s ease-in-out infinite;}',
    '.glow2{position:fixed;bottom:-20%;right:-20%;width:60%;height:60%;background:radial-gradient(ellipse,#4d553d44 0%,transparent 65%);pointer-events:none;z-index:0;animation:gm 10s ease-in-out infinite reverse;}',
    '@keyframes gm{0%,100%{transform:scale(1);}50%{transform:scale(1.2) translate(3%,3%);}}',
    '.grid{position:fixed;inset:0;background-image:linear-gradient(#ffffff03 1px,transparent 1px),linear-gradient(90deg,#ffffff03 1px,transparent 1px);background-size:48px 48px;pointer-events:none;z-index:0;}',
    '.page{max-width:480px;margin:0 auto;position:relative;z-index:1;}',
    '.intro{position:fixed;top:0;left:0;right:0;bottom:0;background:#0a0c0a;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 28px;text-align:center;z-index:50;transition:opacity 0.4s ease;}',
    '.intro .lbl{font-size:11px;font-weight:800;letter-spacing:4px;color:' + ACCENT + ';margin-bottom:36px;opacity:0.8;}',
    '.intro .ico{font-size:72px;margin-bottom:20px;filter:drop-shadow(0 0 20px ' + ACCENT + '88);animation:fl 3s ease-in-out infinite;}',
    '@keyframes fl{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}',
    '.intro h2{font-size:26px;font-weight:900;margin-bottom:10px;}',
    '.intro .sub{font-size:14px;color:#666;line-height:1.7;margin-bottom:8px;}',
    '.intro .timing{font-size:11px;color:' + ACCENT + ';letter-spacing:2px;margin-bottom:36px;font-weight:700;}',
    '.btn-start{padding:16px 48px;background:transparent;color:' + ACCENT + ';border:2px solid ' + ACCENT + ';border-radius:40px;font-size:16px;font-weight:800;cursor:pointer;letter-spacing:1px;transition:all 0.3s;margin-bottom:20px;}',
    '.btn-start:hover{box-shadow:0 0 28px ' + ACCENT + '66;transform:translateY(-2px);}',
    '.btn-start:active{transform:scale(0.96);}',
    '.btn-rec{display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 28px;color:#c0622a;font-size:13px;font-weight:700;text-decoration:none;border:1px solid #c0622a66;border-radius:40px;transition:all 0.3s;letter-spacing:0.5px;}',
    '.btn-rec:hover{border-color:#c0622a;background:#c0622a11;box-shadow:0 0 18px #c0622a33;}',
    '.qwrap{min-height:100vh;display:flex;flex-direction:column;}',
    '.qhdr{padding:20px 22px 14px;border-bottom:1px solid #181818;}',
    '.qhdr .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}',
    '.qhdr .logo{font-size:11px;font-weight:800;letter-spacing:3px;color:' + ACCENT + ';opacity:0.85;}',
    '.qhdr .ag{font-size:11px;color:#383838;font-weight:600;}',
    '.qhdr .sec{font-size:10px;color:#555;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;}',
    '.prog-i{display:flex;justify-content:space-between;font-size:10px;color:#383838;font-weight:700;letter-spacing:0.5px;margin-bottom:7px;}',
    '.prog-i span:last-child{color:' + ACCENT + ';}',
    '.prog-b{height:3px;background:#151515;border-radius:3px;overflow:hidden;}',
    '.prog-f{height:3px;border-radius:3px;background:linear-gradient(90deg,#4d553d,' + ACCENT + ');transition:width 0.5s ease;box-shadow:0 0 6px ' + ACCENT + '88;}',
    '.qbody{flex:1;padding:22px;overflow-y:auto;}',
    '.qcard{animation:su 0.35s ease;}',
    '@keyframes su{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}',
    '.qn{font-size:10px;color:#383838;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;}',
    '.qi{font-size:44px;margin-bottom:14px;display:block;filter:drop-shadow(0 0 14px ' + ACCENT + '66);}',
    '.ql{font-size:19px;font-weight:800;color:#fff;line-height:1.45;margin-bottom:24px;}',
    '.opts{display:flex;flex-direction:column;gap:9px;}',
    '.opt{display:flex;align-items:center;gap:12px;padding:15px 16px;border:1px solid #1c1c1c;border-radius:14px;background:#0d100d;cursor:pointer;transition:all 0.22s;width:100%;text-align:left;}',
    '.opt:active{transform:scale(0.97);}',
    '.opt.sel{border-color:' + ACCENT + ';box-shadow:0 0 0 1px ' + ACCENT + ';background:#0d100d;}',
    '.opt .tx{font-size:14px;font-weight:600;color:#666;transition:color 0.2s;}',
    '.opt.sel .tx{color:#fff;}',
    '.opt .ck{margin-left:auto;width:20px;height:20px;border-radius:50%;border:1px solid #2a2a2a;display:flex;align-items:center;justify-content:center;font-size:10px;color:#000;font-weight:900;flex-shrink:0;transition:all 0.2s;}',
    '.opt.sel .ck{background:' + ACCENT + ';border-color:' + ACCENT + ';}',
    '.nps-g{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;margin-bottom:7px;}',
    '.nps-g2{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;}',
    '.nb{padding:13px 2px;border:1px solid #1c1c1c;border-radius:11px;background:#0d100d;cursor:pointer;font-size:15px;font-weight:800;color:#444;text-align:center;transition:all 0.2s;}',
    '.nb:active{transform:scale(0.9);}',
    '.nb.sel{border-color:#4d553d;color:#a6c47a;box-shadow:0 0 14px #4d553d88;}',
    '.npsl{display:flex;justify-content:space-between;font-size:10px;color:#383838;margin-top:7px;letter-spacing:0.5px;}',
    'textarea{width:100%;padding:14px;border:1px solid #1c1c1c;border-radius:14px;font-size:14px;font-family:inherit;resize:none;min-height:120px;background:#0d100d;color:#fff;transition:all 0.2s;}',
    'textarea:focus{outline:none;border-color:' + ACCENT + ';}',
    'textarea::placeholder{color:#2a2a2a;}',
    '.qnav{padding:14px 22px 28px;border-top:1px solid #111;}',
    '.navbtns{display:flex;gap:10px;}',
    '.bbk{flex:1;padding:15px;border:1px solid #1a1a1a;border-radius:14px;background:transparent;font-size:14px;font-weight:700;color:#383838;cursor:pointer;display:none;}',
    '.bbk:hover{color:#666;}',
    '.bnx{flex:2;padding:15px;border:2px solid ' + ACCENT + ';border-radius:14px;background:transparent;font-size:14px;font-weight:800;color:' + ACCENT + ';cursor:pointer;letter-spacing:0.5px;transition:all 0.3s;}',
    '.bnx:hover{box-shadow:0 0 22px ' + ACCENT + '44;}',
    '.bnx:active{transform:scale(0.97);}',
    '.bnx:disabled{opacity:0.2;cursor:not-allowed;box-shadow:none;}',
    '.suc{display:none;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px;text-align:center;}',
    '.suc.show{display:flex;}',
    '.suc .si{font-size:72px;margin-bottom:20px;filter:drop-shadow(0 0 28px ' + ACCENT + ');animation:pop 0.6s ease;}',
    '@keyframes pop{0%{transform:scale(0);opacity:0;}60%{transform:scale(1.2);}100%{transform:scale(1);opacity:1;}}',
    '.suc h2{font-size:28px;font-weight:900;margin-bottom:12px;}',
    '.suc p{font-size:14px;color:#555;line-height:1.7;}'
  ].join('');

  var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">'
    + '<title>Enquête de satisfaction — BCEG</title>'
    + '<style>' + css + '</style></head><body>'
    + '<div class="grid"></div><div class="glow1"></div><div class="glow2"></div>'
    + '<div class="page">'
    + '<div class="intro" id="intro">'
    + '  <div class="lbl">BCEG &middot; SATISFACTION</div>'
    + '  <div class="ico">📋</div>'
    + '  <h2>Bonjour ' + prenom + ' !</h2>'
    + '  <p class="sub">Votre avis nous aide à améliorer nos services.<br>Nous vous invitons à évaluer votre parcours,<br>de votre demande jusqu\'à son suivi.</p>'
    + '  <div class="timing">&#9201; &nbsp;3 A 5 MINUTES</div>'
    + '  <button class="btn-start" onclick="demarrer()">COMMENCER &nbsp;&rarr;</button>'
    + '  <a href="https://bceg-reclamations-production.up.railway.app/depot-reclamation" class="btn-rec">&#9888; &nbsp;Deposer une reclamation</a>'
    + '</div>'
    + '<div class="qwrap" id="qwrap">'
    + '  <div class="qhdr">'
    + '    <div class="top"><span class="logo">BCEG</span><span class="ag">' + agence + (isDemo ? ' &middot; DEMO' : '') + '</span></div>'
    + '    <div class="sec" id="pSec"></div>'
    + '    <div class="prog-i"><span id="pTxt"></span><span id="pPct">0%</span></div>'
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
    + '  <p>Votre avis a bien été enregistré.<br>La BCEG vous remercie de votre confiance.</p>'
    + '</div>'
    + '</div>'
    + '<script>'
    + 'var ALLQ=' + qDataStr + ';'
    + 'var EID=' + enqueteId + ';'
    + 'var REP={};'
    + 'var ACTIVE=[];'
    + 'var CUR=0;'
    + 'var SCALE5=' + JSON.stringify(SCALE5_DEFAULT) + ';'
    + 'function computeActive(){'
    + '  ACTIVE=ALLQ.filter(function(q){return !q.skip||q.skip==="raison_non_traite"?true:true;});'
    + '  ACTIVE=ALLQ.filter(function(q){'
    + '    if(q.id==="raison_non_traite"){return REP.traite_premier_contact==="Non";}'
    + '    return true;'
    + '  });'
    + '}'
    + 'function demarrer(){'
    + '  var intro=document.getElementById("intro");'
    + '  intro.style.opacity="0";'
    + '  intro.style.pointerEvents="none";'
    + '  setTimeout(function(){intro.style.display="none";},400);'
    + '  computeActive();'
    + '  renderQ();'
    + '}'
    + 'function renderQ(){'
    + '  computeActive();'
    + '  if(CUR>=ACTIVE.length){envoyer();return;}'
    + '  var q=ACTIVE[CUR];'
    + '  var total=ACTIVE.length;'
    + '  var pct=Math.round(((CUR+1)/total)*100);'
    + '  document.getElementById("pBar").style.width=pct+"%";'
    + '  document.getElementById("pSec").textContent=q.section;'
    + '  document.getElementById("pTxt").textContent="Question "+(CUR+1)+" / "+total;'
    + '  document.getElementById("pPct").textContent=pct+"%";'
    + '  document.getElementById("bbk").style.display=CUR>0?"block":"none";'
    + '  document.getElementById("bnx").textContent=CUR===total-1?"ENVOYER MON AVIS":"CONTINUER";'
    + '  var already=REP[q.id]!==undefined&&REP[q.id]!==null&&REP[q.id]!=="";'
    + '  document.getElementById("bnx").disabled=q.optional?false:!already;'
    + '  var html="";'
    + '  var labels=q.scaleLabels||SCALE5;'
    + '  if(q.type==="scale5"){'
    + '    var btns=labels.map(function(lab,i){'
    + '      var v=i+1;var s=REP[q.id]===v?" sel":"";'
    + '      return "<button class=\\"opt"+s+"\\" onclick=\\"selChoice(this,\'"+q.id+"\',"+v+")\\">"+"<span class=\\"tx\\">"+v+" &middot; "+lab+"</span>"+"<span class=\\"ck\\">"+(s?"&#10003;":"")+"</span></button>";'
    + '    }).join("");'
    + '    html="<div class=\\"qcard\\"><div class=\\"qi\\">"+q.icon+"</div><div class=\\"ql\\">"+q.label+"</div><div class=\\"opts\\">"+btns+"</div></div>";'
    + '  }else if(q.type==="choice"){'
    + '    var btns2=q.options.map(function(opt){'
    + '      var s=REP[q.id]===opt?" sel":"";'
    + '      return "<button class=\\"opt"+s+"\\" onclick=\\"selChoice(this,\'"+q.id+"\',\'"+opt.replace(/\'/g,"\\\\\'")+"\')\\">"+"<span class=\\"tx\\">"+opt+"</span>"+"<span class=\\"ck\\">"+(s?"&#10003;":"")+"</span></button>";'
    + '    }).join("");'
    + '    html="<div class=\\"qcard\\"><div class=\\"qi\\">"+q.icon+"</div><div class=\\"ql\\">"+q.label+"</div><div class=\\"opts\\">"+btns2+"</div></div>";'
    + '  }else if(q.type==="scale10"){'
    + '    var nb=[0,1,2,3,4,5,6,7,8,9,10].map(function(n){var s=REP[q.id]===n?" sel":"";return"<button class=\\"nb"+s+"\\" onclick=\\"selNum(\'"+q.id+"\',"+n+")\\">"+n+"</button>";});'
    + '    html="<div class=\\"qcard\\"><div class=\\"qi\\">"+q.icon+"</div><div class=\\"ql\\">"+q.label+"</div><div class=\\"nps-g\\">"+nb.slice(0,6).join("")+"</div><div class=\\"nps-g2\\">"+nb.slice(6).join("")+"</div><div class=\\"npsl\\"><span>Pas du tout probable</span><span>Tout à fait probable</span></div></div>";'
    + '  }else if(q.type==="textarea"){'
    + '    html="<div class=\\"qcard\\"><div class=\\"qi\\">"+q.icon+"</div><div class=\\"ql\\">"+q.label+(q.optional?" <span style=\\"color:#444;font-weight:400;font-size:13px;\\">(optionnel)</span>":"")+"</div><textarea id=\\"freetext\\" placeholder=\\"Votre réponse...\\">"+(REP[q.id]||"")+"</textarea></div>";'
    + '  }'
    + '  document.getElementById("qBody").innerHTML=html;'
    + '  var ta=document.getElementById("freetext");'
    + '  if(ta){ta.addEventListener("input",function(){REP[q.id]=ta.value;document.getElementById("bnx").disabled=false;});}'
    + '}'
    + 'function selChoice(btn,key,val){'
    + '  REP[key]=val;'
    + '  document.querySelectorAll(".opt").forEach(function(b){b.classList.remove("sel");var c=b.querySelector(".ck");if(c)c.innerHTML="";});'
    + '  btn.classList.add("sel");var c=btn.querySelector(".ck");if(c)c.innerHTML="&#10003;";'
    + '  document.getElementById("bnx").disabled=false;'
    + '  setTimeout(function(){suivant();},350);'
    + '}'
    + 'function selNum(key,n){'
    + '  REP[key]=n;'
    + '  document.querySelectorAll(".nb").forEach(function(b){b.classList.toggle("sel",parseInt(b.textContent)===n);});'
    + '  document.getElementById("bnx").disabled=false;'
    + '  setTimeout(function(){suivant();},350);'
    + '}'
    + 'function suivant(){CUR++;renderQ();}'
    + 'function precedent(){if(CUR>0){CUR--;renderQ();}}'
    + 'function envoyer(){'
    + '  var payload=Object.assign({enquete_id:EID},REP);'
    + '  fetch("/enquete/repondre",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})'
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

router.get('/demo', (req, res) => {
  const client = { prenom: 'Demo', nom: '', operation_id: 0, agence_nom: 'BCEG' };
  res.send(genererPage(client, true));
});

router.get('/:clientId', (req, res) => {
  db.get('SELECT c.*, o.id as operation_id, o.type_operation, a.nom as agence_nom FROM clients c LEFT JOIN operations o ON o.client_id=c.id LEFT JOIN agences a ON a.id=c.agence_id WHERE c.id=?',
    [req.params.clientId], (err, client) => {
    if (!client) client = { prenom: 'Demo', nom: '', operation_id: 0, type_operation: 'Visite en agence', agence_nom: 'BCEG' };
    res.send(genererPage(client, false));
  });
});

router.post('/repondre', (req, res) => {
  const b = req.body || {};
  const champs = [
    'enquete_id', 'secteur_activite', 'anciennete_client', 'objet_demarche', 'canal_demarche',
    'note_qualite_accueil', 'note_courtoisie', 'note_disponibilite', 'note_rapidite_prise_en_charge',
    'note_orientation', 'temps_attente', 'conseiller_joignable', 'conseiller_ecoute',
    'clarte_informations', 'traite_premier_contact', 'raison_non_traite', 'informe_avancement',
    'delai_traitement', 'delai_respecte', 'reponse_adaptee', 'suivi_apres_service',
    'note_globale', 'score_nps', 'commentaire'
  ];
  const valeurs = champs.map(c => (b[c] !== undefined ? b[c] : null));
  const placeholders = champs.map(() => '?').join(',');

  db.run(
    `INSERT INTO reponses (${champs.join(',')}, date_reponse) VALUES (${placeholders}, datetime('now'))`,
    valeurs,
    function (err) {
      if (err) return res.status(500).json({ error: 'Erreur', detail: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

module.exports = router;
