const express = require('express');
const router = express.Router();
const db = require('../models/database');
const path = require('path');
const fs = require('fs');

router.get('/', function(req, res) {
  db.all(`SELECT r.*, o.type_operation, c.nom as client_nom, c.prenom as client_prenom, a.nom as agence_nom
          FROM reponses r
          LEFT JOIN enquetes e ON e.id = r.enquete_id
          LEFT JOIN operations o ON o.id = e.operation_id
          LEFT JOIN clients c ON c.id = o.client_id
          LEFT JOIN agences a ON a.id = c.agence_id
          ORDER BY r.date_reponse DESC`, [], function(err, reponses) {
    reponses = reponses || [];
    db.all("SELECT * FROM reclamations ORDER BY date_reception DESC", [], function(err2, reclamations) {
      reclamations = reclamations || [];

      var total = reponses.length;
      function moy(field) {
        if (total === 0) return '0.0';
        return (reponses.reduce(function(s,r){return s+(r[field]||0);},0)/total).toFixed(1);
      }
      var promoteurs = reponses.filter(function(r){return r.score_nps>=9;}).length;
      var detracteurs = reponses.filter(function(r){return r.score_nps<=6;}).length;
      var neutres = reponses.filter(function(r){return r.score_nps>=7&&r.score_nps<=8;}).length;
      var nps = total>0?Math.round(((promoteurs-detracteurs)/total)*100):0;
      var recNouv = reclamations.filter(function(r){return r.statut==='Nouvelle';}).length;
      var recEnCours = reclamations.filter(function(r){return r.statut==='En cours';}).length;
      var recResolue = reclamations.filter(function(r){return r.statut==='Resolue';}).length;

      // Stats par agence
      var agences = {};
      reponses.forEach(function(r) {
        var ag = r.agence_nom || 'Non renseigne';
        if (!agences[ag]) agences[ag] = {total:0, somme:0};
        agences[ag].total++;
        agences[ag].somme += (r.note_globale||0);
      });

      var rowsSat = reponses.slice(0,20).map(function(r) {
        var npsClass = r.score_nps>=9?'pro':r.score_nps>=7?'neu':'det';
        var npsLbl = r.score_nps>=9?'Pro':r.score_nps>=7?'Neutre':'Det';
        var npsColor = r.score_nps>=9?'#27ae60':r.score_nps>=7?'#f39c12':'#e74c3c';
        var noteColor = function(n) { return n>=4?'#27ae60':n>=3?'#f39c12':'#e74c3c'; };
        return '<tr>'
          +'<td>'+(r.date_reponse||'-').toString().substring(0,10)+'</td>'
          +'<td><b>'+(r.client_prenom||'Demo')+' '+(r.client_nom||'')+'</b></td>'
          +'<td>'+(r.agence_nom||'-')+'</td>'
          +'<td>'+(r.type_operation||'-')+'</td>'
          +'<td style="color:'+noteColor(r.note_accueil)+';font-weight:bold;">'+(r.note_accueil||'-')+'/5</td>'
          +'<td style="color:'+noteColor(r.note_attente)+';font-weight:bold;">'+(r.note_attente||'-')+'/5</td>'
          +'<td style="color:'+noteColor(r.note_conseiller)+';font-weight:bold;">'+(r.note_conseiller||'-')+'/5</td>'
          +'<td style="color:'+noteColor(r.note_traitement)+';font-weight:bold;">'+(r.note_traitement||'-')+'/5</td>'
          +'<td style="color:'+noteColor(r.note_globale)+';font-weight:bold;">'+(r.note_globale||'-')+'/5</td>'
          +'<td><span style="background:'+(npsColor)+'22;color:'+npsColor+';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;">'+(r.score_nps!==null?r.score_nps:'-')+' '+npsLbl+'</span></td>'
          +'<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(r.commentaire||'-')+'</td>'
          +'</tr>';
      }).join('');

      var rowsRec = reclamations.map(function(r) {
        var fichierBtn = r.fichier_path ? '<a href="/enquete/fichier/'+r.fichier_path+'" target="_blank" style="background:#4d553d;color:white;padding:3px 8px;border-radius:6px;font-size:11px;text-decoration:none;">Voir</a>' : '<span style="color:#ccc;">-</span>';
        var statutColor = r.statut==='Nouvelle'?'#e74c3c':r.statut==='En cours'?'#f39c12':'#27ae60';
        return '<tr>'
          +'<td><b style="color:#4d553d;">'+r.numero_suivi+'</b></td>'
          +'<td>'+(r.date_reception||'-').toString().substring(0,10)+'</td>'
          +'<td><b>'+r.nom_client+'</b></td>'
          +'<td>'+(r.telephone||'-')+'</td>'
          +'<td>'+(r.email||'-')+'</td>'
          +'<td>'+(r.agence||'-')+'</td>'
          +'<td>'+(r.categorie||'-')+'</td>'
          +'<td style="max-width:180px;" title="'+(r.description||'')+'">'+(r.description||'-').substring(0,60)+(r.description&&r.description.length>60?'...':'')+'</td>'
          +'<td>'+fichierBtn+'</td>'
          +'<td><select onchange="maj('+r.id+',this.value)" style="padding:4px 6px;border:1px solid #ddd;border-radius:6px;font-size:11px;color:'+statutColor+';font-weight:bold;">'
          +'<option style="color:#e74c3c;" '+(r.statut==='Nouvelle'?'selected':'')+'>Nouvelle</option>'
          +'<option style="color:#f39c12;" '+(r.statut==='En cours'?'selected':'')+'>En cours</option>'
          +'<option style="color:#27ae60;" '+(r.statut==='Resolue'?'selected':'')+'>Resolue</option>'
          +'</select></td>'
          +'</tr>';
      }).join('');

      var agenceRows = Object.entries(agences).map(function(entry) {
        var nom = entry[0]; var data = entry[1];
        var moy2 = (data.somme/data.total).toFixed(1);
        var color = parseFloat(moy2)>=4?'#27ae60':parseFloat(moy2)>=3?'#f39c12':'#e74c3c';
        return '<div style="display:flex;align-items:center;margin-bottom:10px;">'
          +'<div style="width:200px;font-size:13px;color:#333;flex-shrink:0;">'+nom+'</div>'
          +'<div style="flex:1;background:#e8ede8;border-radius:6px;height:12px;margin:0 12px;">'
          +'<div style="height:12px;border-radius:6px;background:'+color+';width:'+(parseFloat(moy2)/5*100)+'%;"></div></div>'
          +'<div style="font-size:13px;font-weight:bold;color:'+color+';width:70px;text-align:right;">'+moy2+'/5 <span style="color:#aaa;font-size:11px;">('+data.total+')</span></div>'
          +'</div>';
      }).join('');

      res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Dashboard BCEG — Satisfaction Client</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,sans-serif;background:#f3f6f3;color:#2c2c2c;}
header{background:#4d553d;color:white;padding:16px 28px;display:flex;align-items:center;justify-content:space-between;}
header h1{font-size:22px;font-weight:bold;}
header p{font-size:12px;color:#c8d4c8;}
.tabs{background:#3a4130;display:flex;padding:0 28px;gap:4px;}
.tab{padding:14px 22px;color:#a6aa9e;cursor:pointer;font-size:14px;font-weight:bold;border-bottom:3px solid transparent;transition:all 0.2s;}
.tab:hover{color:white;}
.tab.active{color:white;border-bottom-color:#a6aa9e;}
.container{max-width:1200px;margin:0 auto;padding:24px 16px;}
.tab-content{display:none;}
.tab-content.active{display:block;}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;}
.kpi{background:white;border-radius:10px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,0.07);border-top:4px solid #4d553d;}
.kpi.or{border-top-color:#c0622a;}
.kpi.ro{border-top-color:#e74c3c;}
.kpi.ve{border-top-color:#27ae60;}
.kpi .lb{font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}
.kpi .vl{font-size:34px;font-weight:bold;color:#4d553d;}
.kpi.or .vl{color:#c0622a;}
.kpi.ro .vl{color:#e74c3c;}
.kpi.ve .vl{color:#27ae60;}
.kpi .sb{font-size:12px;color:#888;margin-top:4px;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}
@media(max-width:800px){.grid2{grid-template-columns:1fr;}}
.card{background:white;border-radius:10px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.07);margin-bottom:20px;}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.card-header h3{font-size:15px;color:#4d553d;font-weight:bold;}
.export-btn{background:#4d553d;color:white;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;text-decoration:none;display:inline-block;}
.export-btn:hover{background:#3a4130;}
.nps-box{text-align:center;}
.nps-sc{font-size:70px;font-weight:bold;color:#4d553d;line-height:1;}
.nps-bars{display:flex;gap:10px;margin-top:18px;}
.nps-b{flex:1;text-align:center;}
.nps-b .nb{font-size:22px;font-weight:bold;}
.nps-b .lb2{font-size:11px;color:#888;margin-top:4px;}
.pro{color:#27ae60;}
.neu{color:#f39c12;}
.det{color:#e74c3c;}
table{width:100%;border-collapse:collapse;font-size:12px;}
th{background:#4d553d;color:white;padding:10px 10px;text-align:left;white-space:nowrap;}
td{padding:9px 10px;border-bottom:1px solid #eee;vertical-align:middle;}
tr:hover td{background:#f9f9f7;}
.alerte{background:#fde8e8;border-left:4px solid #e74c3c;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#c0392b;}
.empty{text-align:center;color:#aaa;padding:40px;font-size:14px;}
</style>
</head>
<body>
<header>
  <div>
    <h1>BCEG — Satisfaction Client</h1>
    <p>Tableau de bord — Mis a jour en temps reel</p>
  </div>
  <div style="text-align:right;font-size:12px;color:#c8d4c8;">
    <div style="font-size:16px;font-weight:bold;">${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</div>
    <div>Banque pour le Commerce et l'Entrepreneuriat du Gabon</div>
  </div>
</header>

<div class="tabs">
  <div class="tab active" onclick="showTab('sat',this)">📊 Satisfaction Client</div>
  <div class="tab" onclick="showTab('rec',this)">⚠️ Reclamations <span style="background:#e74c3c;color:white;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px;">${recNouv}</span></div>
</div>

<div class="container">

  <!-- ONGLET SATISFACTION -->
  <div class="tab-content active" id="tab-sat">
    ${recNouv>0?'<div class="alerte"><b>'+recNouv+' nouvelle(s) reclamation(s) en attente</b> — Consultez l\'onglet Reclamations.</div>':''}

    <div class="kpi-grid">
      <div class="kpi"><div class="lb">Reponses recues</div><div class="vl">${total}</div><div class="sb">enquetes completees</div></div>
      <div class="kpi"><div class="lb">Satisfaction globale</div><div class="vl">${moy('note_globale')}<span style="font-size:18px;">/5</span></div><div class="sb">note moyenne</div></div>
      <div class="kpi ${nps>=30?'ve':nps>=0?'or':'ro'}"><div class="lb">Score NPS</div><div class="vl">${nps}</div><div class="sb">Net Promoter Score</div></div>
      <div class="kpi ro"><div class="lb">Reclamations</div><div class="vl">${reclamations.length}</div><div class="sb">${recNouv} nouvelle(s)</div></div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-header"><h3>📈 Notes moyennes par critere</h3></div>
        ${[['Accueil en agence','note_accueil'],['Temps d\'attente','note_attente'],['Qualite conseiller','note_conseiller'],['Traitement operation','note_traitement'],['Services digitaux','note_applications'],['Satisfaction globale','note_globale']].map(function(c){
          var v=parseFloat(moy(c[1])); var col=v>=4?'#27ae60':v>=3?'#f39c12':'#e74c3c';
          return '<div style="display:flex;align-items:center;margin-bottom:10px;"><div style="width:165px;font-size:13px;color:#555;flex-shrink:0;">'+c[0]+'</div><div style="flex:1;background:#e8ede8;border-radius:6px;height:10px;margin:0 10px;"><div style="height:10px;border-radius:6px;background:'+col+';width:'+(v/5*100)+'%;"></div></div><div style="font-size:13px;font-weight:bold;color:'+col+';width:36px;text-align:right;">'+moy(c[1])+'/5</div></div>';
        }).join('')}
      </div>

      <div class="card nps-box">
        <div class="card-header"><h3>🎯 NPS — Net Promoter Score</h3></div>
        <div class="nps-sc">${nps}</div>
        <div style="font-size:12px;color:#888;margin-top:4px;">Score NPS</div>
        <div class="nps-bars">
          <div class="nps-b"><div class="nb pro">${promoteurs}</div><div class="lb2">Promoteurs<br>9-10</div></div>
          <div class="nps-b"><div class="nb neu">${neutres}</div><div class="lb2">Neutres<br>7-8</div></div>
          <div class="nps-b"><div class="nb det">${detracteurs}</div><div class="lb2">Detracteurs<br>0-6</div></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>🏦 Satisfaction par agence</h3>
      </div>
      ${Object.keys(agences).length===0?'<div class="empty">Aucune donnee disponible</div>':agenceRows}
    </div>

    <div class="card">
      <div class="card-header">
        <h3>📋 Historique des questionnaires</h3>
        <a href="/dashboard/export-satisfaction" class="export-btn">⬇️ Exporter Excel</a>
      </div>
      ${total===0?'<div class="empty">Aucune reponse pour l\'instant</div>':
      '<div style="overflow-x:auto;"><table><thead><tr><th>Date</th><th>Client</th><th>Agence</th><th>Operation</th><th>Accueil</th><th>Attente</th><th>Conseiller</th><th>Traitement</th><th>Global</th><th>NPS</th><th>Commentaire</th></tr></thead><tbody>'+rowsSat+'</tbody></table></div>'}
    </div>
  </div>

  <!-- ONGLET RECLAMATIONS -->
  <div class="tab-content" id="tab-rec">
    <div class="kpi-grid">
      <div class="kpi ro"><div class="lb">Nouvelles</div><div class="vl">${recNouv}</div><div class="sb">a traiter</div></div>
      <div class="kpi or"><div class="lb">En cours</div><div class="vl">${recEnCours}</div><div class="sb">en traitement</div></div>
      <div class="kpi ve"><div class="lb">Resolues</div><div class="vl">${recResolue}</div><div class="sb">terminees</div></div>
      <div class="kpi"><div class="lb">Total</div><div class="vl">${reclamations.length}</div><div class="sb">reclamations</div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>📋 Liste des reclamations</h3>
        <a href="/dashboard/export-reclamations" class="export-btn">⬇️ Exporter Excel</a>
      </div>
      ${reclamations.length===0?'<div class="empty">Aucune reclamation pour l\'instant</div>':
      '<div style="overflow-x:auto;"><table><thead><tr><th>N° Suivi</th><th>Date</th><th>Client</th><th>Telephone</th><th>Email</th><th>Agence</th><th>Categorie</th><th>Description</th><th>Fichier</th><th>Statut</th></tr></thead><tbody>'+rowsRec+'</tbody></table></div>'}
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
function maj(id,statut){
  fetch('/dashboard/statut',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,statut:statut})});
}
setTimeout(function(){location.reload();},60000);
</script>
</body>
</html>`);
    });
  });
});

// CHANGER STATUT RECLAMATION
router.post('/statut', function(req, res) {
  db.run("UPDATE reclamations SET statut=?, date_traitement=datetime('now') WHERE id=?",
    [req.body.statut, req.body.id],
    function(err) {
      if(err) return res.status(500).json({error:'Erreur'});
      res.json({success:true});
    }
  );
});

// EXPORT SATISFACTION CSV
router.get('/export-satisfaction', function(req, res) {
  db.all(`SELECT r.date_reponse, c.nom, c.prenom, a.nom as agence, o.type_operation,
          r.note_accueil, r.note_attente, r.note_conseiller, r.note_traitement,
          r.note_applications, r.note_globale, r.score_nps, r.commentaire
          FROM reponses r
          LEFT JOIN enquetes e ON e.id=r.enquete_id
          LEFT JOIN operations o ON o.id=e.operation_id
          LEFT JOIN clients c ON c.id=o.client_id
          LEFT JOIN agences a ON a.id=c.agence_id
          ORDER BY r.date_reponse DESC`, [], function(err, rows) {
    rows = rows || [];
    var csv = 'Date,Nom,Prenom,Agence,Operation,Accueil,Attente,Conseiller,Traitement,Services digitaux,Global,NPS,Commentaire\n';
    rows.forEach(function(r) {
      csv += [(r.date_reponse||'').toString().substring(0,10), r.nom||'', r.prenom||'', r.agence||'',
              r.type_operation||'', r.note_accueil||'', r.note_attente||'', r.note_conseiller||'',
              r.note_traitement||'', r.note_applications||'', r.note_globale||'',
              r.score_nps||'', '"'+(r.commentaire||'').replace(/"/g,'""')+'"'].join(',') + '\n';
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="BCEG_Satisfaction_'+new Date().toISOString().substring(0,10)+'.csv"');
    res.send('\uFEFF' + csv);
  });
});

// EXPORT RECLAMATIONS CSV
router.get('/export-reclamations', function(req, res) {
  db.all("SELECT * FROM reclamations ORDER BY date_reception DESC", [], function(err, rows) {
    rows = rows || [];
    var csv = 'N° Suivi,Date,Client,Telephone,Email,Agence,Categorie,Description,Fichier,Statut\n';
    rows.forEach(function(r) {
      csv += [r.numero_suivi||'', (r.date_reception||'').toString().substring(0,10),
              r.nom_client||'', r.telephone||'', r.email||'', r.agence||'',
              r.categorie||'', '"'+(r.description||'').replace(/"/g,'""')+'"',
              r.fichier_nom||'', r.statut||''].join(',') + '\n';
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="BCEG_Reclamations_'+new Date().toISOString().substring(0,10)+'.csv"');
    res.send('\uFEFF' + csv);
  });
});

module.exports = router;
