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
  'credit': { titre: 'Demande de credit', icon: '💼', color: '#2d6a9f', questions: [
    { id: 'note_accueil', label: "Comment evaluez-vous l'accueil de votre conseiller ?", icon: '🤝' },
    { id: 'note_attente', label: "Le delai de traitement de votre dossier etait-il satisfaisant ?", icon: '⏱️' },
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
    { id: 'note_globale', label: "Quelle note globale donnez-vous aux services digitaux ?", icon: '⭐' }
  ]},
  'default': { titre: 'Votre visite en agence', icon: '🏦', color: '#4d553d', questions: [
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
  var color = q.color;
  var total = q.questions.length + 2;
  var enqueteId = client.operation_id || 0;
  var prenom = isDemo ? 'Demo' : (client.prenom || 'Client');
  var agence = client.agence_nom || 'BCEG';

  var qData = JSON.stringify(q.questions.map(function(quest) {
    return { id: quest.id, label: quest.label, icon: quest.icon };
  }));

  return '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">\n<title>Enquete BCEG</title>\n<style>\n'
    + '*{box-sizing:border-box;margin:0;padding:0;}\n'
    + 'body{font-family:Segoe UI,Arial,sans-serif;background:#f0f3f0;min-height:100vh;}\n'
    + '.page{max-width:480px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;}\n'
    + '.top-bar{background:' + color + ';padding:20px 20px 32px;}\n'
    + '.top-bar .logo{color:rgba(255,255,255,0.8);font-size:12px;font-weight:700;letter-spacing:2px;margin-bottom:12px;}\n'
    + '.top-bar .titre{color:white;font-size:20px;font-weight:800;}\n'
    + '.top-bar .agence{color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;}\n'
    + '.prog-wrap{background:white;padding:16px 20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);}\n'
    + '.prog-info{display:flex;justify-content:space-between;font-size:12px;color:#888;font-weight:600;margin-bottom:8px;}\n'
    + '.prog-bar{height:8px;background:#e8ede8;border-radius:8px;overflow:hidden;}\n'
    + '.prog-fill{height:8px;border-radius:8px;background:' + color + ';transition:width 0.5s ease;}\n'
    + '.body{flex:1;padding:20px;}\n'
    + '.q-card{background:white;border-radius:20px;padding:28px 22px;box-shadow:0 4px 20px rgba(0,0,0,0.08);margin-bottom:16px;display:none;}\n'
    + '.q-card.active{display:block;animation:fadeUp 0.35s ease;}\n'
    + '@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}\n'
    + '.q-icon{font-size:44px;margin-bottom:14px;display:block;}\n'
    + '.q-label{font-size:17px;font-weight:800;color:#1a1a1a;line-height:1.4;margin-bottom:22px;}\n'
    + '.q-num{font-size:11px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;}\n'
    + '.opts{display:flex;flex-direction:column;gap:10px;}\n'
    + '.opt{display:flex;align-items:center;gap:12px;padding:14px 16px;border:2px solid #e8e8e8;border-radius:14px;background:#fafafa;cursor:pointer;transition:all 0.2s;width:100%;text-align:left;}\n'
    + '.opt:hover{border-color:' + color + ';background:' + color + '10;}\n'
    + '.opt.sel{border-color:' + color + ';background:' + color + '15;}\n'
    + '.opt .em{font-size:22px;flex-shrink:0;}\n'
    + '.opt .tx{font-size:14px;font-weight:600;color:#333;}\n'
    + '.opt .ck{margin-left:auto;width:22px;height:22px;border-radius:50%;border:2px solid #ddd;background:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s;}\n'
    + '.opt.sel .ck{background:' + color + ';border-color:' + color + ';}\n'
    + '.nps-row{display:flex;flex-wrap:wrap;gap:8px;}\n'
    + '.nps-b{flex:1;min-width:36px;padding:12px 4px;border:2px solid #e8e8e8;border-radius:12px;background:#fafafa;cursor:pointer;font-size:15px;font-weight:800;color:#555;text-align:center;transition:all 0.2s;}\n'
    + '.nps-b:hover{border-color:' + color + ';}\n'
    + '.nps-b.sel{background:' + color + ';border-color:' + color + ';color:white;}\n'
    + '.nps-lbl{display:flex;justify-content:space-between;font-size:11px;color:#aaa;margin-top:8px;}\n'
    + 'textarea{width:100%;padding:14px;border:2px solid #e8e8e8;border-radius:14px;font-size:14px;font-family:inherit;resize:none;min-height:110px;background:#fafafa;transition:all 0.2s;}\n'
    + 'textarea:focus{outline:none;border-color:' + color + ';background:white;}\n'
    + '.opt-tag{background:' + color + '15;color:' + color + ';padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:12px;}\n'
    + '.nav{background:white;padding:16px 20px;box-shadow:0 -2px 12px rgba(0,0,0,0.06);display:flex;gap:10px;position:sticky;bottom:0;}\n'
    + '.btn-back{flex:1;padding:14px;border:2px solid #e0e0e0;border-radius:14px;background:white;font-size:14px;font-weight:700;color:#888;cursor:pointer;display:none;}\n'
    + '.btn-next{flex:2;padding:14px;border:none;border-radius:14px;font-size:15px;font-weight:800;color:white;cursor:pointer;background:' + color + ';box-shadow:0 6px 20px ' + color + '40;transition:all 0.2s;}\n'
    + '.btn-next:disabled{opacity:0.45;cursor:not-allowed;}\n'
    + '.btn-rec{display:block;text-align:center;padding:12px;color:' + color + ';font-size:13px;font-weight:700;text-decoration:none;margin-top:8px;}\n'
    + '.success{display:none;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px;text-align:center;}\n'
    + '.success.show{display:flex;}\n'
    + '.intro{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px;text-align:center;}\n'
    + '.intro .big{font-size:80px;margin-bottom:20px;}\n'
    + '.intro h2{font-size:24px;font-weight:900;margin-bottom:10px;}\n'
    + '.intro p{color:#888;font-size:15px;line-height:1.6;margin-bottom:28px;}\n'
    + '.intro .badge{background:' + color + '15;color:' + color + ';padding:8px 16px;border-radius:20px;font-size:13px;font-weight:700;margin-bottom:28px;display:inline-block;}\n'
    + '.btn-start{padding:16px 48px;background:' + color + ';color:white;border:none;border-radius:18px;font-size:17px;font-weight:800;cursor:pointer;box-shadow:0 10px 28px ' + color + '40;margin-bottom:12px;}\n'
    + '</style>\n</head>\n<body>\n<div class="page">\n'
    + '<div class="intro" id="intro">\n'
    + '  <div class="big">' + q.icon + '</div>\n'
    + '  <h2>Bonjour ' + prenom + ' ! 👋</h2>\n'
    + '  <p>Votre avis compte pour la BCEG.<br>Cette enquete prend moins de <b>2 minutes</b>.</p>\n'
    + '  <div class="badge">⏱️ Moins de 2 minutes</div>\n'
    + '  <button class="btn-start" id="btnStart">Commencer →</button>\n'
    + '  <a href="https://bceg-reclamations-production.up.railway.app/depot-reclamation" class="btn-rec">⚠️ Deposer une reclamation</a>\n'
    + '</div>\n'
    + '<div id="questionnaire" style="display:none;flex:1;display:none;flex-direction:column;">\n'
    + '  <div class="top-bar">\n'
    + '    <div class="logo">BCEG</div>\n'
    + '    <div class="titre">' + q.icon + ' ' + q.titre + '</div>\n'
    + '    <div class="agence">' + agence + (isDemo ? ' · Mode demonstration' : '') + '</div>\n'
    + '  </div>\n'
    + '  <div class="prog-wrap">\n'
    + '    <div class="prog-info"><span id="progTxt">Question 1 sur ' + total + '</span><span id="progPct">0%</span></div>\n'
    + '    <div class="prog-bar"><div class="prog-fill" id="progFill" style="width:0%"></div></div>\n'
    + '  </div>\n'
    + '  <div class="body" id="qBody"></div>\n'
    + '  <div class="nav">\n'
    + '    <button class="btn-back" id="btnBack" onclick="precedent()">← Retour</button>\n'
    + '    <button class="btn-next" id="btnNext" disabled onclick="suivant()">Continuer →</button>\n'
    + '  </div>\n'
    + '</div>\n'
    + '<div class="success" id="success">\n'
    + '  <div style="font-size:80px;margin-bottom:20px;">🎉</div>\n'
    + '  <h2 style="font-size:26px;font-weight:900;margin-bottom:10px;">Merci !</h2>\n'
    + '  <p style="color:#888;font-size:15px;line-height:1.6;">Votre avis a bien ete enregistre.<br>La BCEG vous remercie de votre confiance.</p>\n'
    + '  <div style="font-size:40px;margin-top:20px;">😊</div>\n'
    + '</div>\n'
    + '</div>\n'
    + '<script>\n'
    + 'var qs = ' + qData + ';\n'
    + 'var total = ' + total + ';\n'
    + 'var cur = 0;\n'
    + 'var rep = {};\n'
    + 'var opts = [{v:1,e:"😞",l:"Tres insatisfait"},{v:2,e:"😕",l:"Insatisfait"},{v:3,e:"😐",l:"Neutre"},{v:4,e:"🙂",l:"Satisfait"},{v:5,e:"😄",l:"Tres satisfait"}];\n'
    + '\n'
    + 'document.getElementById("btnStart").onclick = function() {\n'
    + '  document.getElementById("intro").style.display = "none";\n'
    + '  var q = document.getElementById("questionnaire");\n'
    + '  q.style.display = "flex";\n'
    + '  q.style.flexDirection = "column";\n'
    + '  q.style.flex = "1";\n'
    + '  renderQ();\n'
    + '};\n'
    + '\n'
    + 'function renderQ() {\n'
    + '  var body = document.getElementById("qBody");\n'
    + '  var pct = Math.round(((cur+1)/total)*100);\n'
    + '  document.getElementById("progFill").style.width = pct + "%";\n'
    + '  document.getElementById("progTxt").textContent = "Question " + (cur+1) + " sur " + total;\n'
    + '  document.getElementById("progPct").textContent = pct + "%";\n'
    + '  document.getElementById("btnBack").style.display = cur > 0 ? "block" : "none";\n'
    + '  document.getElementById("btnNext").disabled = true;\n'
    + '  document.getElementById("btnNext").textContent = cur === total-1 ? "Envoyer mon avis ✓" : "Continuer →";\n'
    + '\n'
    + '  var html = "";\n'
    + '  if (cur < qs.length) {\n'
    + '    var q = qs[cur];\n'
    + '    var btns = opts.map(function(o) {\n'
    + '      var s = rep[q.id] === o.v ? " sel" : "";\n'
    + '      return "<button class=\\"opt" + s + "\\" onclick=\\"selQ(this,\'" + q.id + "\'," + o.v + ")\\">"\n'
    + '        + "<span class=\\"em\\">" + o.e + "</span>"\n'
    + '        + "<span class=\\"tx\\">" + o.l + "</span>"\n'
    + '        + "<span class=\\"ck\\">" + (s?" ✓":"") + "</span>"\n'
    + '        + "</button>";\n'
    + '    }).join("");\n'
    + '    html = "<div style=\\"animation:fadeUp 0.3s ease\\">"\n'
    + '      + "<div class=\\"q-num\\">Question " + (cur+1) + " sur " + total + "</div>"\n'
    + '      + "<div class=\\"q-icon\\">" + q.icon + "</div>"\n'
    + '      + "<div class=\\"q-label\\">" + q.label + "</div>"\n'
    + '      + "<div class=\\"opts\\">" + btns + "</div>"\n'
    + '      + "</div>";\n'
    + '    if (rep[q.id]) document.getElementById("btnNext").disabled = false;\n'
    + '  } else if (cur === qs.length) {\n'
    + '    var nbtns = [0,1,2,3,4,5,6,7,8,9,10].map(function(n) {\n'
    + '      var s = rep.nps === n ? " sel" : "";\n'
    + '      return "<button class=\\"nps-b" + s + "\\" onclick=\\"selNPS(" + n + ")\\">" + n + "</button>";\n'
    + '    }).join("");\n'
    + '    html = "<div style=\\"animation:fadeUp 0.3s ease\\">"\n'
    + '      + "<div class=\\"q-num\\">Question " + (cur+1) + " sur " + total + "</div>"\n'
    + '      + "<div class=\\"q-icon\\">🎯</div>"\n'
    + '      + "<div class=\\"q-label\\">Sur une echelle de 0 a 10, recommanderiez-vous la BCEG a un proche ?</div>"\n'
    + '      + "<div class=\\"nps-row\\">" + nbtns + "</div>"\n'
    + '      + "<div class=\\"nps-lbl\\"><span>😞 Pas du tout</span><span>😄 Certainement</span></div>"\n'
    + '      + "</div>";\n'
    + '    if (rep.nps !== undefined) document.getElementById("btnNext").disabled = false;\n'
    + '  } else {\n'
    + '    html = "<div style=\\"animation:fadeUp 0.3s ease\\">"\n'
    + '      + "<div class=\\"q-num\\">Question " + (cur+1) + " sur " + total + " — Optionnel</div>"\n'
    + '      + "<div class=\\"q-icon\\">💬</div>"\n'
    + '      + "<div class=\\"q-label\\">Un commentaire ou une suggestion ?</div>"\n'
    + '      + "<textarea id=\\"com\\" placeholder=\\"Partagez votre experience...\\"></textarea>"\n'
    + '      + "</div>";\n'
    + '    document.getElementById("btnNext").disabled = false;\n'
    + '  }\n'
    + '\n'
    + '  body.innerHTML = "<div style=\\"background:white;border-radius:20px;padding:24px 20px;box-shadow:0 4px 20px rgba(0,0,0,0.08);\\">" + html + "</div>";\n'
    + '  body.scrollTop = 0;\n'
    + '}\n'
    + '\n'
    + 'function selQ(btn, key, val) {\n'
    + '  rep[key] = val;\n'
    + '  document.querySelectorAll(".opt").forEach(function(b){ b.classList.remove("sel"); b.querySelector(".ck").textContent = ""; });\n'
    + '  btn.classList.add("sel");\n'
    + '  btn.querySelector(".ck").textContent = " ✓";\n'
    + '  document.getElementById("btnNext").disabled = false;\n'
    + '  setTimeout(function(){ if(cur < total-1) suivant(); }, 350);\n'
    + '}\n'
    + '\n'
    + 'function selNPS(n) {\n'
    + '  rep.nps = n;\n'
    + '  document.querySelectorAll(".nps-b").forEach(function(b){ b.classList.toggle("sel", parseInt(b.textContent) === n); });\n'
    + '  document.getElementById("btnNext").disabled = false;\n'
    + '  setTimeout(suivant, 350);\n'
    + '}\n'
    + '\n'
    + 'function suivant() {\n'
    + '  if (cur === total-1) { envoyer(); return; }\n'
    + '  if (cur === qs.length+1) { var c = document.getElementById("com"); if(c) rep.com = c.value; }\n'
    + '  cur++;\n'
    + '  renderQ();\n'
    + '}\n'
    + '\n'
    + 'function precedent() {\n'
    + '  if (cur > 0) { cur--; renderQ(); }\n'
    + '}\n'
    + '\n'
    + 'function envoyer() {\n'
    + '  var c = document.getElementById("com");\n'
    + '  if (c) rep.com = c.value;\n'
    + '  var btn = document.getElementById("btnNext");\n'
    + '  btn.textContent = "Envoi...";\n'
    + '  btn.disabled = true;\n'
    + '  var data = {\n'
    + '    enquete_id: ' + enqueteId + ',\n'
    + '    note_accueil: rep.note_accueil||3,\n'
    + '    note_attente: rep.note_attente||3,\n'
    + '    note_conseiller: rep.note_conseiller||3,\n'
    + '    note_traitement: rep.note_traitement||3,\n'
    + '    note_applications: rep.note_applications||3,\n'
    + '    note_globale: rep.note_globale||3,\n'
    + '    score_nps: rep.nps !== undefined ? rep.nps : 7,\n'
    + '    commentaire: rep.com||""\n'
    + '  };\n'
    + '  fetch("/enquete/repondre",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)})\n'
    + '  .then(function(){ document.getElementById("questionnaire").style.display="none"; document.getElementById("success").style.display="flex"; })\n'
    + '  .catch(function(){ document.getElementById("questionnaire").style.display="none"; document.getElementById("success").style.display="flex"; });\n'
    + '}\n'
    + '</script>\n</body>\n</html>';
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
