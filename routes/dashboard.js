const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/', function(req, res) {
  db.all(`SELECT r.*, o.type_operation, o.nom_gestionnaire,
          c.nom as client_nom, c.prenom as client_prenom, a.nom as agence_nom
          FROM reponses r
          LEFT JOIN enquetes e ON e.id=r.enquete_id
          LEFT JOIN operations o ON o.id=e.operation_id
          LEFT JOIN clients c ON c.id=o.client_id
          LEFT JOIN agences a ON a.id=c.agence_id
          ORDER BY r.date_reponse DESC`, [], function(err, reponses) {
    reponses = reponses || [];

    db.all("SELECT * FROM reclamations ORDER BY date_reception DESC", [], function(err2, reclamations) {
      reclamations = reclamations || [];

      var total = reponses.length;
      var recNouv = reclamations.filter(function(r){return r.statut==='Nouvelle';}).length;
      var recTotal = reclamations.length;

      // Satisfaction moyenne
      var moyGlobale = total===0 ? 0 : reponses.reduce(function(s,r){return s+(r.note_globale||0);},0)/total;
      var moyGlobaleStr = total===0 ? '—' : moyGlobale.toFixed(1);

      // Niveau de satisfaction en texte
      function niveauSat(m) {
        if (m >= 4.5) return { txt: 'Excellent !', color: '#27ae60', emoji: '😄' };
        if (m >= 3.5) return { txt: 'Bien', color: '#4d553d', emoji: '🙂' };
        if (m >= 2.5) return { txt: 'Moyen', color: '#f39c12', emoji: '😐' };
        return { txt: 'A ameliorer', color: '#e74c3c', emoji: '😕' };
      }
      var sat = niveauSat(moyGlobale);

      // Promoteurs (note globale >= 4)
      var promoteurs = reponses.filter(function(r){return r.note_globale>=4;}).length;
      var pctPromoteurs = total===0 ? 0 : Math.round((promoteurs/total)*100);

      // Cette semaine
      var debutSemaine = new Date();
      debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
      debutSemaine.setHours(0,0,0,0);
      var repSemaine = reponses.filter(function(r){
        return r.date_reponse && new Date(r.date_reponse) >= debutSemaine;
      });
      var recSemaine = reclamations.filter(function(r){
        return r.date_reception && new Date(r.date_reception) >= debutSemaine;
      });

      // Par agence
      var agences = {};
      reponses.forEach(function(r) {
        var ag = r.agence_nom || 'Non renseigne';
        if(!agences[ag]) agences[ag]={total:0,somme:0};
        agences[ag].total++;
        agences[ag].somme+=(r.note_globale||0);
      });

      // Par gestionnaire
      var gestionnaires = {};
      reponses.forEach(function(r) {
        if (!r.nom_gestionnaire || !r.nom_gestionnaire.trim()) return;
        var nom = r.nom_gestionnaire.trim();
        if (!gestionnaires[nom]) gestionnaires[nom]={total:0,somme:0};
        gestionnaires[nom].total++;
        gestionnaires[nom].somme+=(r.note_globale||0);
      });

      // Evolution 7 jours
      var joursMap = {};
      var joursLabels = [];
      for(var i=6;i>=0;i--) {
        var d = new Date(); d.setDate(d.getDate()-i);
        var key = d.toISOString().substring(0,10);
        var label = d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'});
        joursMap[key] = 0;
        joursLabels.push({key:key,label:label});
      }
      reponses.forEach(function(r) {
        var k=(r.date_reponse||'').toString().substring(0,10);
        if(joursMap[k]!==undefined) joursMap[k]++;
      });
      var maxJour = Math.max.apply(null, Object.values(joursMap)) || 1;

      var today = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

      // Commentaires recents
      var commentaires = reponses.filter(function(r){return r.commentaire && r.commentaire.trim().length > 5;}).slice(0,5);

      // Agence rows
      var agenceRows = Object.entries(agences).sort(function(a,b){
        return (b[1].somme/b[1].total)-(a[1].somme/a[1].total);
      }).map(function(entry, i) {
        var nom=entry[0]; var d=entry[1];
        var m=(d.somme/d.total).toFixed(1);
        var n = niveauSat(parseFloat(m));
        return '<div style="display:flex;align-items:center;padding:14px 0;border-bottom:1px solid #f5f5f5;">'
          +'<div style="font-size:18px;margin-right:12px;">' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':'') + '</div>'
          +'<div style="flex:1;">'
          +'<div style="font-size:14px;font-weight:700;color:#2c2c2c;">' + nom + '</div>'
          +'<div style="font-size:12px;color:#aaa;margin-top:2px;">' + d.total + ' client(s) ont repondu</div>'
          +'</div>'
          +'<div style="text-align:right;">'
          +'<div style="font-size:20px;font-weight:900;color:'+n.color+';">' + m + '/5</div>'
          +'<div style="font-size:12px;color:'+n.color+';font-weight:600;">' + n.emoji + ' ' + n.txt + '</div>'
          +'</div>'
          +'</div>';
      }).join('');

      // Gestionnaire rows
      var gestRows = Object.entries(gestionnaires).sort(function(a,b){
        return (b[1].somme/b[1].total)-(a[1].somme/a[1].total);
      }).slice(0,5).map(function(entry, i) {
        var nom=entry[0]; var d=entry[1];
        var m=(d.somme/d.total).toFixed(1);
        var n = niveauSat(parseFloat(m));
        return '<div style="display:flex;align-items:center;padding:14px 0;border-bottom:1px solid #f5f5f5;">'
          +'<div style="width:36px;height:36px;border-radius:50%;background:'+n.color+'22;color:'+n.color+';display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;margin-right:12px;flex-shrink:0;">'+(nom.charAt(0))+'</div>'
          +'<div style="flex:1;">'
          +'<div style="font-size:14px;font-weight:700;color:#2c2c2c;">' + nom + '</div>'
          +'<div style="font-size:12px;color:#aaa;">' + d.total + ' evaluation(s) client</div>'
          +'</div>'
          +'<div style="text-align:right;">'
          +'<div style="font-size:20px;font-weight:900;color:'+n.color+';">' + m + '/5</div>'
          +'<div style="font-size:11px;color:'+n.color+';font-weight:600;">' + n.emoji + ' ' + n.txt + '</div>'
          +'</div>'
          +'</div>';
      }).join('');

      // Reclamations rows
      var recRows = reclamations.slice(0,8).map(function(r) {
        var sColor = r.statut==='Nouvelle'?'#e74c3c':r.statut==='En cours'?'#f39c12':'#27ae60';
        var sIcon = r.statut==='Nouvelle'?'🔴':r.statut==='En cours'?'🟡':'🟢';
        return '<div style="padding:14px 0;border-bottom:1px solid #f5f5f5;">'
          +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">'
          +'<div style="flex:1;">'
          +'<div style="font-size:13px;font-weight:700;color:#2c2c2c;">'+r.nom_client+'</div>'
          +'<div style="font-size:12px;color:#aaa;margin-top:2px;">'+r.agence+' · '+(r.categorie||'').substring(0,35)+'</div>'
          +'</div>'
          +'<div style="text-align:right;flex-shrink:0;">'
          +'<div style="font-size:12px;font-weight:700;color:'+sColor+';">'+sIcon+' '+r.statut+'</div>'
          +'<div style="font-size:11px;color:#aaa;margin-top:2px;font-family:monospace;">'+r.numero_suivi+'</div>'
          +'</div>'
          +'</div>'
          +'</div>';
      }).join('');

      // Graphique barres
      var chartBars = joursLabels.map(function(j) {
        var count = joursMap[j.key];
        var h = count > 0 ? Math.max(12, Math.round((count/maxJour)*80)) : 4;
        var col = count > 0 ? '#4d553d' : '#e8ede8';
        var isToday = j.key === new Date().toISOString().substring(0,10);
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">'
          +'<div style="font-size:12px;font-weight:700;color:'+(count>0?'#4d553d':'#ccc')+';">'+(count>0?count:'')+'</div>'
          +'<div style="width:100%;border-radius:6px 6px 0 0;background:'+col+';height:'+h+'px;'+(isToday?'box-shadow:0 0 12px #4d553d66;':'')+'"></div>'
          +'<div style="font-size:10px;color:'+(isToday?'#4d553d':'#aaa')+';font-weight:'+(isToday?'800':'400')+';">'+j.label+'</div>'
          +'</div>';
      }).join('');

      // Commentaires
      var comHTML = commentaires.length === 0
        ? '<div style="text-align:center;color:#aaa;padding:24px;font-size:14px;">Aucun commentaire pour l\'instant</div>'
        : commentaires.map(function(r) {
          return '<div style="background:#f8f9f8;border-radius:12px;padding:14px 16px;margin-bottom:10px;">'
            +'<div style="font-size:14px;color:#333;line-height:1.6;font-style:italic;">"'+r.commentaire+'"</div>'
            +'<div style="font-size:11px;color:#aaa;margin-top:8px;">'+(r.agence_nom||'')+(r.agence_nom&&r.type_operation?' · ':'')+' '+(r.date_reponse||'').toString().substring(0,10)+'</div>'
            +'</div>';
        }).join('');

      res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Satisfaction Client — BCEG</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f7f5;color:#2c2c2c;}
header{background:linear-gradient(135deg,#4d553d,#3a4130);color:white;padding:20px 32px;display:flex;align-items:center;justify-content:space-between;}
header h1{font-size:20px;font-weight:800;}
header p{font-size:12px;color:rgba(255,255,255,0.6);margin-top:2px;}
.hdate{text-align:right;font-size:12px;color:rgba(255,255,255,0.7);}
.hdate b{display:block;font-size:14px;color:white;font-weight:700;text-transform:capitalize;}
.tabs{background:#3a4130;display:flex;padding:0 32px;gap:4px;}
.tab{padding:14px 20px;color:rgba(255,255,255,0.45);cursor:pointer;font-size:13px;font-weight:700;border-bottom:3px solid transparent;transition:all 0.2s;}
.tab.active{color:white;border-bottom-color:#a6c47a;}
.badge{background:#e74c3c;color:white;border-radius:12px;padding:1px 7px;font-size:11px;font-weight:800;margin-left:6px;}
.container{max-width:1200px;margin:0 auto;padding:28px 24px;}
.tab-content{display:none;}.tab-content.active{display:block;}

/* ALERTE SEMAINE */
.alerte-semaine{background:linear-gradient(135deg,#4d553d,#5a6648);border-radius:16px;padding:20px 24px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
.alerte-semaine .txt{color:white;}
.alerte-semaine .txt h3{font-size:16px;font-weight:800;margin-bottom:4px;}
.alerte-semaine .txt p{font-size:13px;color:rgba(255,255,255,0.7);}
.alerte-semaine .chiffres{display:flex;gap:24px;}
.alerte-semaine .chiffre{text-align:center;background:rgba(255,255,255,0.12);border-radius:12px;padding:12px 20px;}
.alerte-semaine .chiffre .nb{font-size:28px;font-weight:900;color:white;}
.alerte-semaine .chiffre .lb{font-size:11px;color:rgba(255,255,255,0.65);margin-top:2px;font-weight:600;}

/* KPI CARDS */
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px;}
.kpi{background:white;border-radius:18px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);position:relative;overflow:hidden;}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:5px;}
.kpi.vert::before{background:#4d553d;}
.kpi.orange::before{background:#f39c12;}
.kpi.rouge::before{background:#e74c3c;}
.kpi.bleu::before{background:#2d6a9f;}
.kpi .question{font-size:13px;color:#888;font-weight:600;margin-bottom:14px;line-height:1.4;}
.kpi .big-val{font-size:44px;font-weight:900;line-height:1;margin-bottom:6px;}
.kpi .explication{font-size:13px;color:#aaa;line-height:1.5;}
.kpi .info-btn{position:absolute;top:16px;right:16px;width:20px;height:20px;border-radius:50%;background:#f0f3f0;color:#aaa;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;cursor:help;}
.kpi .tooltip{display:none;position:absolute;top:44px;right:8px;background:#2c2c2c;color:white;padding:10px 14px;border-radius:10px;font-size:12px;width:220px;line-height:1.5;z-index:10;}
.kpi:hover .tooltip{display:block;}

/* CARDS */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}
@media(max-width:800px){.grid2{grid-template-columns:1fr;}}
.card{background:white;border-radius:18px;padding:22px;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:20px;}
.card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.card-hdr h3{font-size:15px;font-weight:800;color:#2c2c2c;}
.card-hdr .sub{font-size:12px;color:#aaa;margin-top:2px;}
.export-btn{background:linear-gradient(135deg,#4d553d,#3a4130);color:white;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:all 0.2s;}
.export-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(77,85,61,0.3);}

/* GRAPHIQUE */
.chart{display:flex;align-items:flex-end;gap:8px;height:100px;margin-bottom:8px;}

/* EMPTY */
.empty{text-align:center;color:#aaa;padding:40px;font-size:14px;}

/* REC TABLE */
.rec-stat{display:flex;gap:12px;margin-bottom:20px;}
.rec-card{flex:1;border-radius:14px;padding:16px;text-align:center;}
.rec-card.rouge{background:#fde8e8;}
.rec-card.orange{background:#fef0e0;}
.rec-card.vert{background:#e8f5e9;}
.rec-card .rn{font-size:32px;font-weight:900;}
.rec-card.rouge .rn{color:#e74c3c;}
.rec-card.orange .rn{color:#f39c12;}
.rec-card.vert .rn{color:#27ae60;}
.rec-card .rl{font-size:12px;font-weight:600;margin-top:4px;}
.rec-card.rouge .rl{color:#e74c3c;}
.rec-card.orange .rl{color:#f39c12;}
.rec-card.vert .rl{color:#27ae60;}
</style>
</head>
<body>
<header>
  <div>
    <h1>BCEG — Satisfaction Client</h1>
    <p>Tableau de bord qualite — Mis a jour en temps reel</p>
  </div>
  <div class="hdate"><b>${today}</b>Banque pour le Commerce et l'Entrepreneuriat du Gabon</div>
</header>
<div class="tabs">
  <div class="tab active" onclick="showTab('accueil',this)">🏠 Vue d'ensemble</div>
  <div class="tab" onclick="showTab('agences',this)">🏦 Par agence</div>
  <div class="tab" onclick="showTab('commerciaux',this)">👔 Commerciaux</div>
  <div class="tab" onclick="showTab('reclamations',this)">⚠️ Reclamations <span class="badge">${recNouv}</span></div>
  <div class="tab" onclick="showTab('commentaires',this)">💬 Ce que disent les clients</div>
</div>

<div class="container">

  <!-- VUE D'ENSEMBLE -->
  <div class="tab-content active" id="tab-accueil">

    <!-- RESUME SEMAINE -->
    <div class="alerte-semaine">
      <div class="txt">
        <h3>📅 Cette semaine</h3>
        <p>Du lundi au ${today}</p>
      </div>
      <div class="chiffres">
        <div class="chiffre"><div class="nb">${repSemaine.length}</div><div class="lb">Reponses recues</div></div>
        <div class="chiffre"><div class="nb">${recSemaine.length}</div><div class="lb">Reclamations</div></div>
        <a href="/dashboard/export-semaine" class="chiffre" style="text-decoration:none;cursor:pointer;background:rgba(255,255,255,0.2);">
          <div class="nb" style="font-size:20px;">⬇️</div>
          <div class="lb">Exporter la semaine</div>
        </a>
      </div>
    </div>

    <!-- 4 KPI SIMPLES -->
    <div class="kpi-grid">
      <div class="kpi vert">
        <div class="info-btn">?
          <div class="tooltip">C'est le nombre total de clients qui ont repondu a votre questionnaire de satisfaction depuis le debut.</div>
        </div>
        <div class="question">Combien de clients ont donne leur avis ?</div>
        <div class="big-val" style="color:#4d553d;">${total}</div>
        <div class="explication">client(s) ont repondu au questionnaire</div>
      </div>

      <div class="kpi ${moyGlobale>=4?'vert':moyGlobale>=3?'orange':'rouge'}">
        <div class="info-btn">?
          <div class="tooltip">La satisfaction globale est la moyenne des notes donnees par les clients. 5/5 = parfait, 3/5 = moyen, 1/5 = tres mauvais.</div>
        </div>
        <div class="question">Est-ce que nos clients sont satisfaits ?</div>
        <div class="big-val" style="color:${sat.color};">${sat.emoji} ${moyGlobaleStr}<span style="font-size:20px;font-weight:400;">/5</span></div>
        <div class="explication" style="color:${sat.color};font-weight:700;">${sat.txt}</div>
      </div>

      <div class="kpi ${pctPromoteurs>=60?'vert':pctPromoteurs>=40?'orange':'rouge'}">
        <div class="info-btn">?
          <div class="tooltip">Ce sont les clients qui ont donne 4 ou 5 etoiles. Ce sont vos clients les plus satisfaits, ceux qui recommandent la BCEG.</div>
        </div>
        <div class="question">Combien sont vraiment satisfaits ?</div>
        <div class="big-val" style="color:${pctPromoteurs>=60?'#27ae60':pctPromoteurs>=40?'#f39c12':'#e74c3c'};">${pctPromoteurs}%</div>
        <div class="explication">${promoteurs} client(s) sur ${total} ont donne 4 ou 5 etoiles</div>
      </div>

      <div class="kpi ${recNouv===0?'vert':recNouv<=2?'orange':'rouge'}">
        <div class="info-btn">?
          <div class="tooltip">Ce sont les reclamations recues qui n'ont pas encore ete prises en charge par un departement. A traiter en priorite !</div>
        </div>
        <div class="question">Y a-t-il des problemes signales ?</div>
        <div class="big-val" style="color:${recNouv===0?'#27ae60':recNouv<=2?'#f39c12':'#e74c3c'};">${recNouv===0?'✅ 0':'⚠️ '+recNouv}</div>
        <div class="explication">${recNouv===0?'Aucune reclamation en attente':recNouv+' reclamation(s) en attente de traitement'}</div>
      </div>
    </div>

    <!-- GRAPHIQUE 7 JOURS -->
    <div class="card">
      <div class="card-hdr">
        <div>
          <h3>📈 Evolution de la semaine</h3>
          <div class="sub">Nombre de clients ayant repondu chaque jour</div>
        </div>
        <a href="/dashboard/export-satisfaction" class="export-btn">⬇️ Tout exporter</a>
      </div>
      <div class="chart">${chartBars}</div>
      <div style="text-align:center;font-size:12px;color:#aaa;margin-top:8px;">Plus la barre est haute, plus vous avez recu de reponses ce jour-la</div>
    </div>
  </div>

  <!-- PAR AGENCE -->
  <div class="tab-content" id="tab-agences">
    <div class="card">
      <div class="card-hdr">
        <div>
          <h3>🏦 Satisfaction par agence</h3>
          <div class="sub">Classement des agences selon les avis clients</div>
        </div>
        <a href="/dashboard/export-satisfaction" class="export-btn">⬇️ Exporter</a>
      </div>
      ${Object.keys(agences).length===0
        ? '<div class="empty">Aucune donnee disponible pour le moment</div>'
        : agenceRows}
    </div>
  </div>

  <!-- COMMERCIAUX -->
  <div class="tab-content" id="tab-commerciaux">
    <div class="card">
      <div class="card-hdr">
        <div>
          <h3>👔 Performance des commerciaux</h3>
          <div class="sub">Notes donnees par les clients a chaque gestionnaire</div>
        </div>
        <a href="/dashboard/export-commerciaux" class="export-btn">⬇️ Exporter</a>
      </div>
      ${Object.keys(gestionnaires).length===0
        ? '<div class="empty">Les notes des commerciaux apparaitront ici une fois que les clients auront repondu au questionnaire via un fichier Excel avec les noms des gestionnaires.</div>'
        : gestRows}
    </div>
  </div>

  <!-- RECLAMATIONS -->
  <div class="tab-content" id="tab-reclamations">
    <div class="rec-stat">
      <div class="rec-card rouge"><div class="rn">${reclamations.filter(function(r){return r.statut==='Nouvelle';}).length}</div><div class="rl">🔴 A traiter</div></div>
      <div class="rec-card orange"><div class="rn">${reclamations.filter(function(r){return r.statut==='En cours';}).length}</div><div class="rl">🟡 En cours</div></div>
      <div class="rec-card vert"><div class="rn">${reclamations.filter(function(r){return r.statut==='Resolue'||r.statut==='Cloturee';}).length}</div><div class="rl">🟢 Resolues</div></div>
    </div>
    <div class="card">
      <div class="card-hdr">
        <div>
          <h3>⚠️ Liste des reclamations</h3>
          <div class="sub">${recTotal} reclamation(s) au total</div>
        </div>
        <a href="/dashboard/export-reclamations" class="export-btn">⬇️ Exporter</a>
      </div>
      ${reclamations.length===0
        ? '<div class="empty">✅ Aucune reclamation pour le moment !</div>'
        : recRows}
    </div>
  </div>

  <!-- COMMENTAIRES -->
  <div class="tab-content" id="tab-commentaires">
    <div class="card">
      <div class="card-hdr">
        <h3>💬 Ce que disent vos clients</h3>
      </div>
      ${comHTML}
      ${commentaires.length===0?'':'<div style="text-align:center;font-size:12px;color:#aaa;margin-top:12px;">Ces commentaires sont extraits des questionnaires remplis par vos clients</div>'}
    </div>
  </div>

</div>

<script>
function showTab(name,el){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active');});
  el.classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
}
setTimeout(function(){location.reload();},60000);
</script>
</body></html>`);
    });
  });
});

router.post('/statut', function(req, res) {
  db.run("UPDATE reclamations SET statut=?,date_traitement=datetime('now') WHERE id=?",
    [req.body.statut,req.body.id], function(err){ res.json({success:!err}); });
});

router.get('/export-semaine', function(req, res) {
  var debutSemaine = new Date();
  debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
  debutSemaine.setHours(0,0,0,0);
  db.all(`SELECT r.date_reponse, c.nom, c.prenom, a.nom as agence, o.type_operation, o.nom_gestionnaire,
          r.note_accueil, r.note_attente, r.note_conseiller, r.note_traitement, r.note_applications, r.note_globale, r.score_nps, r.commentaire
          FROM reponses r
          LEFT JOIN enquetes e ON e.id=r.enquete_id
          LEFT JOIN operations o ON o.id=e.operation_id
          LEFT JOIN clients c ON c.id=o.client_id
          LEFT JOIN agences a ON a.id=c.agence_id
          WHERE r.date_reponse >= ?
          ORDER BY r.date_reponse DESC`, [debutSemaine.toISOString()], function(err, rows) {
    rows = rows || [];
    var csv = 'Date,Client,Agence,Operation,Gestionnaire,Accueil,Attente,Conseiller,Traitement,Digital,Note Globale,NPS,Commentaire\n';
    rows.forEach(function(r){
      csv += [(r.date_reponse||'').toString().substring(0,10),
              (r.prenom||'')+' '+(r.nom||''), r.agence||'', r.type_operation||'', r.nom_gestionnaire||'',
              r.note_accueil||'', r.note_attente||'', r.note_conseiller||'', r.note_traitement||'',
              r.note_applications||'', r.note_globale||'', r.score_nps||'',
              '"'+(r.commentaire||'').replace(/"/g,'""')+'"'].join(',') + '\n';
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="BCEG_Satisfaction_Semaine_' + new Date().toISOString().substring(0,10) + '.csv"');
    res.send('\uFEFF' + csv);
  });
});

router.get('/export-satisfaction', function(req, res) {
  db.all(`SELECT r.date_reponse, c.nom, c.prenom, a.nom as agence, o.type_operation, o.nom_gestionnaire,
          r.note_accueil, r.note_attente, r.note_conseiller, r.note_traitement, r.note_applications, r.note_globale, r.score_nps, r.commentaire
          FROM reponses r
          LEFT JOIN enquetes e ON e.id=r.enquete_id
          LEFT JOIN operations o ON o.id=e.operation_id
          LEFT JOIN clients c ON c.id=o.client_id
          LEFT JOIN agences a ON a.id=c.agence_id
          ORDER BY r.date_reponse DESC`, [], function(err, rows) {
    rows = rows || [];
    var csv = 'Date,Client,Agence,Operation,Gestionnaire,Accueil,Attente,Conseiller,Traitement,Digital,Note Globale,NPS,Commentaire\n';
    rows.forEach(function(r){
      csv += [(r.date_reponse||'').toString().substring(0,10),
              (r.prenom||'')+' '+(r.nom||''), r.agence||'', r.type_operation||'', r.nom_gestionnaire||'',
              r.note_accueil||'', r.note_attente||'', r.note_conseiller||'', r.note_traitement||'',
              r.note_applications||'', r.note_globale||'', r.score_nps||'',
              '"'+(r.commentaire||'').replace(/"/g,'""')+'"'].join(',') + '\n';
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="BCEG_Satisfaction_' + new Date().toISOString().substring(0,10) + '.csv"');
    res.send('\uFEFF' + csv);
  });
});

router.get('/export-commerciaux', function(req, res) {
  db.all(`SELECT o.nom_gestionnaire, a.nom as agence,
          AVG(r.note_globale) as moy_globale, COUNT(r.id) as nb_eval
          FROM reponses r
          LEFT JOIN enquetes e ON e.id=r.enquete_id
          LEFT JOIN operations o ON o.id=e.operation_id
          LEFT JOIN agences a ON a.id=o.agence_id
          WHERE o.nom_gestionnaire IS NOT NULL AND o.nom_gestionnaire != ''
          GROUP BY o.nom_gestionnaire ORDER BY moy_globale DESC`, [], function(err, rows) {
    rows = rows || [];
    var csv = 'Gestionnaire,Agence,Note Moyenne,Nb Evaluations\n';
    rows.forEach(function(r){
      csv += [r.nom_gestionnaire||'', r.agence||'',
              parseFloat(r.moy_globale||0).toFixed(1), r.nb_eval||0].join(',') + '\n';
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="BCEG_Commerciaux_' + new Date().toISOString().substring(0,10) + '.csv"');
    res.send('\uFEFF' + csv);
  });
});

router.get('/export-reclamations', function(req, res) {
  db.all("SELECT * FROM reclamations ORDER BY date_reception DESC", [], function(err, rows) {
    rows = rows || [];
    var csv = 'N Suivi,Date,Client,Telephone,Agence,Categorie,Statut\n';
    rows.forEach(function(r){
      csv += [r.numero_suivi||'', (r.date_reception||'').toString().substring(0,10),
              r.nom_client||'', r.telephone||'', r.agence||'', r.categorie||'', r.statut||''].join(',') + '\n';
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="BCEG_Reclamations_' + new Date().toISOString().substring(0,10) + '.csv"');
    res.send('\uFEFF' + csv);
  });
});

module.exports = router;
