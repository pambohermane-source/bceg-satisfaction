const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/', function(req, res) {
  db.all(`SELECT r.*, o.type_operation, c.nom as client_nom, c.prenom as client_prenom, a.nom as agence_nom
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
      function moy(f) { return total===0?'0.0':(reponses.reduce(function(s,r){return s+(r[f]||0);},0)/total).toFixed(1); }
      var promoteurs = reponses.filter(function(r){return r.score_nps>=9;}).length;
      var detracteurs = reponses.filter(function(r){return r.score_nps<=6;}).length;
      var neutres = reponses.filter(function(r){return r.score_nps>=7&&r.score_nps<=8;}).length;
      var nps = total>0?Math.round(((promoteurs-detracteurs)/total)*100):0;
      var npsColor = nps>=30?'#27ae60':nps>=0?'#f39c12':'#e74c3c';
      var recNouv = reclamations.filter(function(r){return r.statut==='Nouvelle';}).length;
      var recEnCours = reclamations.filter(function(r){return r.statut==='En cours';}).length;
      var recResolue = reclamations.filter(function(r){return r.statut==='Resolue';}).length;

      // Stats par agence
      var agences = {};
      reponses.forEach(function(r) {
        var ag = r.agence_nom||'Non renseigne';
        if(!agences[ag]) agences[ag]={total:0,somme:0};
        agences[ag].total++; agences[ag].somme+=(r.note_globale||0);
      });

      // Evolution 7 derniers jours
      var joursMap = {};
      for(var i=6;i>=0;i--) {
        var d = new Date(); d.setDate(d.getDate()-i);
        var key = d.toISOString().substring(0,10);
        joursMap[key] = {count:0, somme:0};
      }
      reponses.forEach(function(r) {
        var key = (r.date_reponse||'').toString().substring(0,10);
        if(joursMap[key]) { joursMap[key].count++; joursMap[key].somme+=(r.note_globale||0); }
      });
      var jours = Object.keys(joursMap);
      var chartData = jours.map(function(j) {
        var d = joursMap[j];
        return { date: j.substring(5), count: d.count, moy: d.count>0?(d.somme/d.count).toFixed(1):0 };
      });
      var maxCount = Math.max.apply(null, chartData.map(function(d){return d.count;})) || 1;

      var rowsSat = reponses.slice(0,20).map(function(r) {
        function noteColor(n) { return n>=4?'#27ae60':n>=3?'#f39c12':'#e74c3c'; }
        var npsC = r.score_nps>=9?'#27ae60':r.score_nps>=7?'#f39c12':'#e74c3c';
        var npsL = r.score_nps>=9?'Promoteur':r.score_nps>=7?'Neutre':'Detracteur';
        return '<tr>'
          +'<td>'+((r.date_reponse||'-').toString().substring(0,10))+'</td>'
          +'<td><b>'+(r.client_prenom||'Demo')+' '+(r.client_nom||'')+'</b></td>'
          +'<td><span class="tag-agence">'+(r.agence_nom||'-')+'</span></td>'
          +'<td>'+(r.type_operation||'-')+'</td>'
          +'<td><span class="note" style="background:'+noteColor(r.note_accueil)+'22;color:'+noteColor(r.note_accueil)+'">'+(r.note_accueil||'-')+'/5</span></td>'
          +'<td><span class="note" style="background:'+noteColor(r.note_attente)+'22;color:'+noteColor(r.note_attente)+'">'+(r.note_attente||'-')+'/5</span></td>'
          +'<td><span class="note" style="background:'+noteColor(r.note_conseiller)+'22;color:'+noteColor(r.note_conseiller)+'">'+(r.note_conseiller||'-')+'/5</span></td>'
          +'<td><span class="note" style="background:'+noteColor(r.note_traitement)+'22;color:'+noteColor(r.note_traitement)+'">'+(r.note_traitement||'-')+'/5</span></td>'
          +'<td><span class="note" style="background:'+noteColor(r.note_globale)+'22;color:'+noteColor(r.note_globale)+';font-weight:800;">'+(r.note_globale||'-')+'/5</span></td>'
          +'<td><span class="note" style="background:'+npsC+'22;color:'+npsC+'">'+(r.score_nps!==null?r.score_nps:'-')+' — '+npsL+'</span></td>'
          +'<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#888;">'+(r.commentaire||'—')+'</td>'
          +'</tr>';
      }).join('');

      var rowsRec = reclamations.map(function(r) {
        var sColor = r.statut==='Nouvelle'?'#e74c3c':r.statut==='En cours'?'#f39c12':'#27ae60';
        var fichierBtn = r.fichier_path?'<a href="/enquete/fichier/'+r.fichier_path+'" target="_blank" class="btn-voir">📎 Voir</a>':'<span style="color:#ccc;">—</span>';
        return '<tr>'
          +'<td><b style="color:#4d553d;font-family:monospace;">'+r.numero_suivi+'</b></td>'
          +'<td>'+((r.date_reception||'-').toString().substring(0,10))+'</td>'
          +'<td><b>'+r.nom_client+'</b></td>'
          +'<td>'+(r.telephone||'—')+'</td>'
          +'<td>'+(r.email||'—')+'</td>'
          +'<td><span class="tag-agence">'+(r.agence||'—')+'</span></td>'
          +'<td><span class="tag-cat">'+(r.categorie||'—')+'</span></td>'
          +'<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+(r.description||'')+'"><span style="color:#555;">'+(r.description||'—').substring(0,50)+'</span></td>'
          +'<td>'+fichierBtn+'</td>'
          +'<td><select onchange="maj('+r.id+',this.value)" style="padding:5px 8px;border:1px solid #ddd;border-radius:8px;font-size:12px;font-weight:600;color:'+sColor+';background:'+sColor+'15;">'
          +'<option '+(r.statut==='Nouvelle'?'selected':'')+'>Nouvelle</option>'
          +'<option '+(r.statut==='En cours'?'selected':'')+'>En cours</option>'
          +'<option '+(r.statut==='Resolue'?'selected':'')+'>Resolue</option>'
          +'</select></td>'
          +'</tr>';
      }).join('');

      var agenceRows = Object.entries(agences).sort(function(a,b){return (b[1].somme/b[1].total)-(a[1].somme/a[1].total);}).map(function(entry) {
        var nom=entry[0]; var data=entry[1];
        var m=(data.somme/data.total).toFixed(1);
        var col=parseFloat(m)>=4?'#27ae60':parseFloat(m)>=3?'#f39c12':'#e74c3c';
        var pct=parseFloat(m)/5*100;
        return '<div class="agence-row">'
          +'<div class="agence-nom">'+nom+'</div>'
          +'<div class="agence-bar-bg"><div class="agence-bar" style="width:'+pct+'%;background:'+col+';"></div></div>'
          +'<div class="agence-val" style="color:'+col+';">'+m+'/5 <span style="color:#aaa;font-weight:400;font-size:11px;">('+data.total+' rep.)</span></div>'
          +'</div>';
      }).join('');

      var chartBars = chartData.map(function(d) {
        var h = d.count>0?Math.max(20,Math.round((d.count/maxCount)*120)):4;
        var col = d.count>0?'#4d553d':'#e8ede8';
        return '<div class="chart-col">'
          +'<div class="chart-tooltip">'+d.count+' rep.<br>Moy: '+d.moy+'/5</div>'
          +'<div class="chart-bar" style="height:'+h+'px;background:'+col+';"></div>'
          +'<div class="chart-label">'+d.date+'</div>'
          +'</div>';
      }).join('');

      var today = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

      res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Dashboard BCEG — Satisfaction Client</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f3f0;color:#2c2c2c;}

/* HEADER */
header{background:linear-gradient(135deg,#4d553d 0%,#3a4130 100%);color:white;padding:20px 32px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 24px rgba(0,0,0,0.2);}
header h1{font-size:22px;font-weight:800;letter-spacing:-0.5px;}
header p{font-size:12px;color:rgba(255,255,255,0.65);margin-top:2px;}
.header-date{text-align:right;font-size:13px;color:rgba(255,255,255,0.8);}
.header-date b{display:block;font-size:16px;color:white;font-weight:700;}

/* TABS */
.tabs{background:#3a4130;display:flex;padding:0 32px;border-bottom:1px solid rgba(255,255,255,0.1);}
.tab{padding:16px 24px;color:rgba(255,255,255,0.5);cursor:pointer;font-size:14px;font-weight:700;border-bottom:3px solid transparent;transition:all 0.2s;display:flex;align-items:center;gap:8px;}
.tab:hover{color:rgba(255,255,255,0.8);}
.tab.active{color:white;border-bottom-color:#a6aa9e;}
.badge-tab{background:#e74c3c;color:white;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:800;}

/* CONTAINER */
.container{max-width:1300px;margin:0 auto;padding:28px 24px;}
.tab-content{display:none;}.tab-content.active{display:block;}

/* KPI CARDS */
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;}
.kpi{background:white;border-radius:16px;padding:20px 22px;box-shadow:0 4px 16px rgba(0,0,0,0.06);position:relative;overflow:hidden;transition:transform 0.2s;}
.kpi:hover{transform:translateY(-2px);}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;}
.kpi.vert::before{background:linear-gradient(90deg,#4d553d,#6b7a5a);}
.kpi.orange::before{background:linear-gradient(90deg,#c0622a,#e07b39);}
.kpi.rouge::before{background:linear-gradient(90deg,#e74c3c,#c0392b);}
.kpi.bleu::before{background:linear-gradient(90deg,#2d6a9f,#3498db);}
.kpi.jaune::before{background:linear-gradient(90deg,#f39c12,#f1c40f);}
.kpi .lb{font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-weight:700;}
.kpi .vl{font-size:38px;font-weight:800;color:#2c2c2c;line-height:1;}
.kpi .sb{font-size:12px;color:#aaa;margin-top:6px;}
.kpi .icon{position:absolute;top:18px;right:18px;font-size:28px;opacity:0.15;}

/* CARDS */
.card{background:white;border-radius:16px;padding:22px;box-shadow:0 4px 16px rgba(0,0,0,0.06);margin-bottom:20px;}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.card-header h3{font-size:15px;font-weight:800;color:#2c2c2c;}
.export-btn{background:linear-gradient(135deg,#4d553d,#3a4130);color:white;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:all 0.2s;}
.export-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(77,85,61,0.3);}

.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}
@media(max-width:900px){.grid2{grid-template-columns:1fr;}}

/* CRITERES */
.critere-row{display:flex;align-items:center;margin-bottom:12px;}
.critere-lb{width:175px;font-size:13px;color:#555;flex-shrink:0;font-weight:600;}
.critere-bg{flex:1;background:#f0f3f0;border-radius:8px;height:12px;margin:0 12px;overflow:hidden;}
.critere-bar{height:12px;border-radius:8px;transition:width 0.6s ease;}
.critere-vl{font-size:13px;font-weight:800;width:36px;text-align:right;}

/* NPS */
.nps-box{text-align:center;padding:10px 0;}
.nps-sc{font-size:80px;font-weight:900;line-height:1;}
.nps-sub{font-size:12px;color:#aaa;margin-top:4px;text-transform:uppercase;letter-spacing:1px;}
.nps-bars{display:flex;gap:12px;margin-top:24px;}
.nps-b{flex:1;background:#f8f8f8;border-radius:12px;padding:16px 8px;text-align:center;}
.nps-b .nb{font-size:28px;font-weight:900;}
.nps-b .lb2{font-size:11px;color:#888;margin-top:4px;font-weight:600;}

/* CHART */
.chart-container{display:flex;align-items:flex-end;gap:8px;height:140px;padding:0 8px;}
.chart-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;cursor:pointer;}
.chart-col:hover .chart-tooltip{display:block;}
.chart-tooltip{display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#2c2c2c;color:white;padding:6px 10px;border-radius:8px;font-size:11px;white-space:nowrap;margin-bottom:6px;z-index:10;}
.chart-bar{width:100%;border-radius:6px 6px 0 0;transition:opacity 0.2s;min-height:4px;}
.chart-col:hover .chart-bar{opacity:0.8;}
.chart-label{font-size:10px;color:#aaa;font-weight:600;}

/* AGENCES */
.agence-row{display:flex;align-items:center;margin-bottom:12px;}
.agence-nom{width:210px;font-size:13px;color:#333;flex-shrink:0;font-weight:600;}
.agence-bar-bg{flex:1;background:#f0f3f0;border-radius:8px;height:12px;margin:0 12px;overflow:hidden;}
.agence-bar{height:12px;border-radius:8px;transition:width 0.6s ease;}
.agence-val{font-size:13px;font-weight:800;width:110px;text-align:right;}

/* TABLE */
table{width:100%;border-collapse:collapse;font-size:12px;}
th{background:#f8f9f8;color:#555;padding:12px 10px;text-align:left;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;font-size:11px;border-bottom:2px solid #e8ede8;}
td{padding:10px 10px;border-bottom:1px solid #f5f5f5;vertical-align:middle;}
tr:hover td{background:#fafcfa;}
.note{display:inline-block;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:700;}
.tag-agence{background:#e8ede8;color:#4d553d;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:600;}
.tag-cat{background:#e8f4fd;color:#2d6a9f;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:600;}
.btn-voir{background:#4d553d;color:white;padding:4px 10px;border-radius:8px;font-size:11px;text-decoration:none;font-weight:700;}
.btn-voir:hover{background:#3a4130;}

.alerte{background:linear-gradient(135deg,#fde8e8,#fdf0f0);border-left:4px solid #e74c3c;border-radius:12px;padding:14px 18px;margin-bottom:20px;font-size:14px;color:#c0392b;font-weight:600;}
.empty{text-align:center;color:#aaa;padding:48px;font-size:14px;}
.empty-icon{font-size:48px;margin-bottom:12px;}
</style>
</head>
<body>

<header>
  <div>
    <h1>BCEG — Satisfaction Client</h1>
    <p>Tableau de bord back-office — Mis a jour en temps reel</p>
  </div>
  <div class="header-date">
    <b>${today}</b>
    Banque pour le Commerce et l'Entrepreneuriat du Gabon
  </div>
</header>

<div class="tabs">
  <div class="tab active" onclick="showTab('sat',this)">📊 Satisfaction Client</div>
  <div class="tab" onclick="showTab('rec',this)">⚠️ Reclamations <span class="badge-tab">${recNouv}</span></div>
</div>

<div class="container">

  <!-- TAB SATISFACTION -->
  <div class="tab-content active" id="tab-sat">
    ${recNouv>0?'<div class="alerte">⚠️ <b>'+recNouv+' nouvelle(s) reclamation(s)</b> en attente de traitement — Consultez l\'onglet Reclamations.</div>':''}

    <div class="kpi-grid">
      <div class="kpi vert"><div class="icon">📋</div><div class="lb">Reponses recues</div><div class="vl">${total}</div><div class="sb">enquetes completees</div></div>
      <div class="kpi bleu"><div class="icon">⭐</div><div class="lb">Satisfaction globale</div><div class="vl">${moy('note_globale')}<span style="font-size:20px;font-weight:400;">/5</span></div><div class="sb">note moyenne</div></div>
      <div class="kpi ${nps>=30?'vert':nps>=0?'jaune':'rouge'}"><div class="icon">🎯</div><div class="lb">Score NPS</div><div class="vl" style="color:${npsColor};">${nps}</div><div class="sb">Net Promoter Score</div></div>
      <div class="kpi orange"><div class="icon">⚠️</div><div class="lb">Reclamations</div><div class="vl">${reclamations.length}</div><div class="sb">${recNouv} nouvelle(s)</div></div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-header"><h3>📈 Notes moyennes par critere</h3></div>
        ${[['😊 Accueil','note_accueil'],['⏱️ Temps attente','note_attente'],['🤝 Conseiller','note_conseiller'],['⚡ Traitement','note_traitement'],['📱 Services digitaux','note_applications'],['⭐ Satisfaction globale','note_globale']].map(function(c){
          var v=parseFloat(moy(c[1]));
          var col=v>=4?'#27ae60':v>=3?'#f39c12':'#e74c3c';
          return '<div class="critere-row"><div class="critere-lb">'+c[0]+'</div><div class="critere-bg"><div class="critere-bar" style="width:'+(v/5*100)+'%;background:'+col+';"></div></div><div class="critere-vl" style="color:'+col+';">'+moy(c[1])+'/5</div></div>';
        }).join('')}
      </div>

      <div class="card nps-box">
        <div class="card-header"><h3>🎯 NPS — Net Promoter Score</h3></div>
        <div class="nps-sc" style="color:${npsColor};">${nps}</div>
        <div class="nps-sub">Net Promoter Score</div>
        <div class="nps-bars">
          <div class="nps-b"><div class="nb" style="color:#27ae60;">${promoteurs}</div><div class="lb2">Promoteurs<br>Note 9-10</div></div>
          <div class="nps-b"><div class="nb" style="color:#f39c12;">${neutres}</div><div class="lb2">Neutres<br>Note 7-8</div></div>
          <div class="nps-b"><div class="nb" style="color:#e74c3c;">${detracteurs}</div><div class="lb2">Detracteurs<br>Note 0-6</div></div>
        </div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-header"><h3>📅 Evolution sur 7 jours</h3></div>
        <div class="chart-container">${chartBars}</div>
        <div style="text-align:center;font-size:11px;color:#aaa;margin-top:12px;">Nombre de reponses par jour — Survolez pour les details</div>
      </div>

      <div class="card">
        <div class="card-header"><h3>🏦 Satisfaction par agence</h3></div>
        ${Object.keys(agences).length===0?'<div class="empty"><div class="empty-icon">🏦</div>Aucune donnee disponible</div>':agenceRows}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>📋 Historique des questionnaires</h3>
        <a href="/dashboard/export-satisfaction" class="export-btn">⬇️ Exporter en CSV</a>
      </div>
      ${total===0?'<div class="empty"><div class="empty-icon">📭</div>Aucune reponse pour l\'instant</div>':
      '<div style="overflow-x:auto;"><table><thead><tr><th>Date</th><th>Client</th><th>Agence</th><th>Operation</th><th>Accueil</th><th>Attente</th><th>Conseiller</th><th>Traitement</th><th>Global</th><th>NPS</th><th>Commentaire</th></tr></thead><tbody>'+rowsSat+'</tbody></table></div>'}
    </div>
  </div>

  <!-- TAB RECLAMATIONS -->
  <div class="tab-content" id="tab-rec">
    <div class="kpi-grid">
      <div class="kpi rouge"><div class="icon">🔴</div><div class="lb">Nouvelles</div><div class="vl">${recNouv}</div><div class="sb">a traiter en priorite</div></div>
      <div class="kpi jaune"><div class="icon">🟡</div><div class="lb">En cours</div><div class="vl">${recEnCours}</div><div class="sb">en traitement</div></div>
      <div class="kpi vert"><div class="icon">🟢</div><div class="lb">Resolues</div><div class="vl">${recResolue}</div><div class="sb">terminees</div></div>
      <div class="kpi bleu"><div class="icon">📋</div><div class="lb">Total</div><div class="vl">${reclamations.length}</div><div class="sb">reclamations recues</div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>📋 Liste des reclamations</h3>
        <a href="/dashboard/export-reclamations" class="export-btn">⬇️ Exporter en CSV</a>
      </div>
      ${reclamations.length===0?'<div class="empty"><div class="empty-icon">✅</div>Aucune reclamation pour l\'instant</div>':
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
</body></html>`);
    });
  });
});

router.post('/statut', function(req, res) {
  db.run("UPDATE reclamations SET statut=?,date_traitement=datetime('now') WHERE id=?",
    [req.body.statut,req.body.id],
    function(err){ if(err) return res.status(500).json({error:'Erreur'}); res.json({success:true}); }
  );
});

router.get('/export-satisfaction', function(req, res) {
  db.all(`SELECT r.date_reponse,c.nom,c.prenom,a.nom as agence,o.type_operation,
          r.note_accueil,r.note_attente,r.note_conseiller,r.note_traitement,
          r.note_applications,r.note_globale,r.score_nps,r.commentaire
          FROM reponses r
          LEFT JOIN enquetes e ON e.id=r.enquete_id
          LEFT JOIN operations o ON o.id=e.operation_id
          LEFT JOIN clients c ON c.id=o.client_id
          LEFT JOIN agences a ON a.id=c.agence_id
          ORDER BY r.date_reponse DESC`, [], function(err, rows) {
    rows=rows||[];
    var csv='Date,Nom,Prenom,Agence,Operation,Accueil,Attente,Conseiller,Traitement,Digitaux,Global,NPS,Commentaire\n';
    rows.forEach(function(r){
      csv+=[(r.date_reponse||'').toString().substring(0,10),r.nom||'',r.prenom||'',r.agence||'',
            r.type_operation||'',r.note_accueil||'',r.note_attente||'',r.note_conseiller||'',
            r.note_traitement||'',r.note_applications||'',r.note_globale||'',
            r.score_nps||'','"'+(r.commentaire||'').replace(/"/g,'""')+'"'].join(',')+'\n';
    });
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="BCEG_Satisfaction_'+new Date().toISOString().substring(0,10)+'.csv"');
    res.send('\uFEFF'+csv);
  });
});

router.get('/export-reclamations', function(req, res) {
  db.all("SELECT * FROM reclamations ORDER BY date_reception DESC", [], function(err, rows) {
    rows=rows||[];
    var csv='N Suivi,Date,Client,Telephone,Email,Agence,Categorie,Description,Fichier,Statut\n';
    rows.forEach(function(r){
      csv+=[r.numero_suivi||'',(r.date_reception||'').toString().substring(0,10),
            r.nom_client||'',r.telephone||'',r.email||'',r.agence||'',
            r.categorie||'','"'+(r.description||'').replace(/"/g,'""')+'"',
            r.fichier_nom||'',r.statut||''].join(',')+'\n';
    });
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="BCEG_Reclamations_'+new Date().toISOString().substring(0,10)+'.csv"');
    res.send('\uFEFF'+csv);
  });
});

module.exports = router;
