const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/', function(req, res) {
  db.all(`SELECT r.*, o.type_operation, o.code_gestionnaire, o.nom_gestionnaire,
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

      // Stats par gestionnaire
      var gestionnaires = {};
      reponses.forEach(function(r) {
        if (!r.nom_gestionnaire) return;
        var nom = r.nom_gestionnaire.trim();
        if (!nom) return;
        if (!gestionnaires[nom]) gestionnaires[nom] = { total:0, accueil:0, conseiller:0, globale:0, nps_total:0, nps_count:0 };
        gestionnaires[nom].total++;
        gestionnaires[nom].accueil += (r.note_accueil||0);
        gestionnaires[nom].conseiller += (r.note_conseiller||0);
        gestionnaires[nom].globale += (r.note_globale||0);
        if (r.score_nps !== null) { gestionnaires[nom].nps_total += r.score_nps; gestionnaires[nom].nps_count++; }
      });

      // Evolution 7 jours
      var joursMap = {};
      for(var i=6;i>=0;i--) { var d=new Date(); d.setDate(d.getDate()-i); joursMap[d.toISOString().substring(0,10)]={count:0,somme:0}; }
      reponses.forEach(function(r) { var k=(r.date_reponse||'').toString().substring(0,10); if(joursMap[k]){joursMap[k].count++;joursMap[k].somme+=(r.note_globale||0);} });
      var jours = Object.keys(joursMap);
      var chartData = jours.map(function(j){var d=joursMap[j];return{date:j.substring(5),count:d.count,moy:d.count>0?(d.somme/d.count).toFixed(1):0};});
      var maxCount = Math.max.apply(null,chartData.map(function(d){return d.count;}))||1;

      function noteColor(n) { return n>=4?'#27ae60':n>=3?'#f39c12':'#e74c3c'; }

      var rowsSat = reponses.slice(0,20).map(function(r) {
        var npsC=r.score_nps>=9?'#27ae60':r.score_nps>=7?'#f39c12':'#e74c3c';
        var npsL=r.score_nps>=9?'Pro':r.score_nps>=7?'Neutre':'Det';
        return '<tr>'
          +'<td>'+((r.date_reponse||'-').toString().substring(0,10))+'</td>'
          +'<td><b>'+(r.client_prenom||'Demo')+' '+(r.client_nom||'')+'</b></td>'
          +'<td><span class="tag vert">'+(r.agence_nom||'-')+'</span></td>'
          +'<td>'+(r.nom_gestionnaire||'-')+'</td>'
          +'<td>'+(r.type_operation||'-')+'</td>'
          +'<td><span class="note" style="background:'+noteColor(r.note_accueil)+'22;color:'+noteColor(r.note_accueil)+'">'+(r.note_accueil||'-')+'/5</span></td>'
          +'<td><span class="note" style="background:'+noteColor(r.note_attente)+'22;color:'+noteColor(r.note_attente)+'">'+(r.note_attente||'-')+'/5</span></td>'
          +'<td><span class="note" style="background:'+noteColor(r.note_conseiller)+'22;color:'+noteColor(r.note_conseiller)+'">'+(r.note_conseiller||'-')+'/5</span></td>'
          +'<td><span class="note" style="background:'+noteColor(r.note_globale)+'22;color:'+noteColor(r.note_globale)+';font-weight:800;">'+(r.note_globale||'-')+'/5</span></td>'
          +'<td><span class="note" style="background:'+npsC+'22;color:'+npsC+'">'+(r.score_nps!==null?r.score_nps:'-')+' '+npsL+'</span></td>'
          +'<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#888;">'+(r.commentaire||'—')+'</td>'
          +'</tr>';
      }).join('');

      var rowsGest = Object.entries(gestionnaires).sort(function(a,b){return (b[1].somme/b[1].total)-(a[1].somme/a[1].total);}).map(function(entry, ri) {
        var nom=entry[0]; var d=entry[1];
        var moyAcc=(d.accueil/d.total).toFixed(1);
        var moyCons=(d.conseiller/d.total).toFixed(1);
        var moyGlob=(d.globale/d.total).toFixed(1);
        var moyNPS=d.nps_count>0?(d.nps_total/d.nps_count).toFixed(1):'-';
        var medal = ri===0?'🥇':ri===1?'🥈':ri===2?'🥉':'';
        return '<tr>'
          +'<td><b>'+(ri+1)+'. '+medal+' '+nom+'</b></td>'
          +'<td style="text-align:center;"><span class="note" style="background:'+noteColor(parseFloat(moyAcc))+'22;color:'+noteColor(parseFloat(moyAcc))+';">'+moyAcc+'/5</span></td>'
          +'<td style="text-align:center;"><span class="note" style="background:'+noteColor(parseFloat(moyCons))+'22;color:'+noteColor(parseFloat(moyCons))+';">'+moyCons+'/5</span></td>'
          +'<td style="text-align:center;"><span class="note" style="background:'+noteColor(parseFloat(moyGlob))+'22;color:'+noteColor(parseFloat(moyGlob))+';">'+moyGlob+'/5</span></td>'
          +'<td style="text-align:center;font-weight:700;color:#2d6a9f;">'+moyNPS+'</td>'
          +'<td style="text-align:center;color:#888;">'+d.total+' eval.</td>'
          +'</tr>';
      }).join('');

      var rowsRec = reclamations.map(function(r) {
        var sColor=r.statut==='Nouvelle'?'#e74c3c':r.statut==='En cours'?'#f39c12':'#27ae60';
        var fichierBtn=r.fichier_path?'<a href="/enquete/fichier/'+r.fichier_path+'" target="_blank" class="btn-voir">📎 Voir</a>':'<span style="color:#ccc;">—</span>';
        return '<tr>'
          +'<td><b style="color:#4d553d;font-family:monospace;">'+r.numero_suivi+'</b></td>'
          +'<td>'+((r.date_reception||'-').toString().substring(0,10))+'</td>'
          +'<td><b>'+r.nom_client+'</b></td>'
          +'<td>'+(r.telephone||'—')+'</td>'
          +'<td><span class="tag vert">'+(r.agence||'—')+'</span></td>'
          +'<td><span class="tag bleu">'+(r.categorie||'—')+'</span></td>'
          +'<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(r.description||'—').substring(0,50)+'</td>'
          +'<td>'+fichierBtn+'</td>'
          +'<td><select onchange="maj('+r.id+',this.value)" style="padding:5px;border:1px solid #ddd;border-radius:8px;font-size:12px;font-weight:600;color:'+sColor+';">'
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
        return '<div class="agence-row"><div class="agence-nom">'+nom+'</div>'
          +'<div class="agence-bg"><div class="agence-bar" style="width:'+(parseFloat(m)/5*100)+'%;background:'+col+';"></div></div>'
          +'<div class="agence-val" style="color:'+col+';">'+m+'/5 <span style="color:#aaa;font-size:11px;">('+data.total+')</span></div></div>';
      }).join('');

      var chartBars = chartData.map(function(d) {
        var h=d.count>0?Math.max(20,Math.round((d.count/maxCount)*120)):4;
        var col=d.count>0?'#4d553d':'#e8ede8';
        return '<div class="chart-col"><div class="chart-tip">'+d.count+' rep.<br>Moy:'+d.moy+'/5</div>'
          +'<div class="chart-bar" style="height:'+h+'px;background:'+col+';"></div>'
          +'<div class="chart-lbl">'+d.date+'</div></div>';
      }).join('');

      var today = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

      res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Dashboard BCEG — Satisfaction Client</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Segoe UI,Arial,sans-serif;background:#f0f3f0;color:#2c2c2c;}
header{background:linear-gradient(135deg,#4d553d,#3a4130);color:white;padding:20px 32px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 24px rgba(0,0,0,0.2);}
header h1{font-size:22px;font-weight:800;}header p{font-size:12px;color:rgba(255,255,255,0.65);}
.hdate{text-align:right;font-size:13px;color:rgba(255,255,255,0.8);}
.hdate b{display:block;font-size:16px;color:white;font-weight:700;}
.tabs{background:#3a4130;display:flex;padding:0 32px;border-bottom:1px solid rgba(255,255,255,0.1);}
.tab{padding:16px 22px;color:rgba(255,255,255,0.5);cursor:pointer;font-size:13px;font-weight:700;border-bottom:3px solid transparent;transition:all 0.2s;}
.tab:hover{color:rgba(255,255,255,0.8);}
.tab.active{color:white;border-bottom-color:#a6aa9e;}
.badge-tab{background:#e74c3c;color:white;border-radius:12px;padding:2px 7px;font-size:11px;font-weight:800;margin-left:4px;}
.container{max-width:1300px;margin:0 auto;padding:24px 20px;}
.tab-content{display:none;}.tab-content.active{display:block;}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px;margin-bottom:24px;}
.kpi{background:white;border-radius:16px;padding:20px;box-shadow:0 4px 16px rgba(0,0,0,0.06);position:relative;overflow:hidden;transition:transform 0.2s;}
.kpi:hover{transform:translateY(-2px);}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;}
.kpi.v::before{background:linear-gradient(90deg,#4d553d,#6b7a5a);}
.kpi.o::before{background:linear-gradient(90deg,#c0622a,#e07b39);}
.kpi.r::before{background:linear-gradient(90deg,#e74c3c,#c0392b);}
.kpi.b::before{background:linear-gradient(90deg,#2d6a9f,#3498db);}
.kpi.j::before{background:linear-gradient(90deg,#f39c12,#f1c40f);}
.kpi.p::before{background:linear-gradient(90deg,#7b3fa0,#9b59b6);}
.kpi .lb{font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-weight:700;}
.kpi .vl{font-size:36px;font-weight:800;color:#2c2c2c;line-height:1;}
.kpi .sb{font-size:12px;color:#aaa;margin-top:6px;}
.kpi .ico{position:absolute;top:18px;right:18px;font-size:28px;opacity:0.12;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}
@media(max-width:900px){.grid2{grid-template-columns:1fr;}}
.card{background:white;border-radius:16px;padding:22px;box-shadow:0 4px 16px rgba(0,0,0,0.06);margin-bottom:20px;}
.card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.card-hdr h3{font-size:15px;font-weight:800;color:#2c2c2c;}
.export-btn{background:linear-gradient(135deg,#4d553d,#3a4130);color:white;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:all 0.2s;}
.export-btn:hover{transform:translateY(-1px);}
.cr-row{display:flex;align-items:center;margin-bottom:12px;}
.cr-lb{width:175px;font-size:13px;color:#555;flex-shrink:0;font-weight:600;}
.cr-bg{flex:1;background:#f0f3f0;border-radius:8px;height:12px;margin:0 12px;overflow:hidden;}
.cr-bar{height:12px;border-radius:8px;transition:width 0.6s ease;}
.cr-vl{font-size:13px;font-weight:800;width:36px;text-align:right;}
.nps-sc{font-size:80px;font-weight:900;line-height:1;text-align:center;}
.nps-sub{font-size:11px;color:#aaa;margin-top:4px;text-transform:uppercase;letter-spacing:1px;text-align:center;}
.nps-bars{display:flex;gap:12px;margin-top:20px;}
.nps-b{flex:1;background:#f8f8f8;border-radius:12px;padding:14px 8px;text-align:center;}
.nps-b .nb{font-size:26px;font-weight:900;}
.nps-b .lb2{font-size:11px;color:#888;margin-top:4px;font-weight:600;}
.chart-container{display:flex;align-items:flex-end;gap:8px;height:140px;padding:0 8px;}
.chart-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;cursor:pointer;}
.chart-col:hover .chart-tip{display:block;}
.chart-tip{display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#2c2c2c;color:white;padding:6px 10px;border-radius:8px;font-size:11px;white-space:nowrap;margin-bottom:6px;z-index:10;}
.chart-bar{width:100%;border-radius:6px 6px 0 0;min-height:4px;}
.chart-lbl{font-size:10px;color:#aaa;font-weight:600;}
.agence-row{display:flex;align-items:center;margin-bottom:12px;}
.agence-nom{width:210px;font-size:13px;color:#333;flex-shrink:0;font-weight:600;}
.agence-bg{flex:1;background:#f0f3f0;border-radius:8px;height:12px;margin:0 12px;overflow:hidden;}
.agence-bar{height:12px;border-radius:8px;}
.agence-val{font-size:13px;font-weight:800;width:110px;text-align:right;}
table{width:100%;border-collapse:collapse;font-size:12px;}
th{background:#f8f9f8;color:#555;padding:11px 10px;text-align:left;font-weight:800;text-transform:uppercase;font-size:11px;border-bottom:2px solid #e8ede8;}
td{padding:10px 10px;border-bottom:1px solid #f5f5f5;vertical-align:middle;}
tr:hover td{background:#fafcfa;}
.note{display:inline-block;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:700;}
.tag{display:inline-block;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:600;}
.tag.vert{background:#e8ede8;color:#4d553d;}
.tag.bleu{background:#e8f4fd;color:#2d6a9f;}
.tag.violet{background:#f0e8fd;color:#7b3fa0;}
.btn-voir{background:#4d553d;color:white;padding:4px 10px;border-radius:8px;font-size:11px;text-decoration:none;font-weight:700;}
.alerte{background:linear-gradient(135deg,#fde8e8,#fdf0f0);border-left:4px solid #e74c3c;border-radius:12px;padding:14px 18px;margin-bottom:20px;font-size:14px;color:#c0392b;font-weight:600;}
.empty{text-align:center;color:#aaa;padding:48px;font-size:14px;}
.podium{display:flex;justify-content:center;gap:20px;margin-bottom:20px;flex-wrap:wrap;}
.podium-card{background:white;border-radius:16px;padding:20px;text-align:center;min-width:180px;box-shadow:0 4px 16px rgba(0,0,0,0.08);flex:1;}
.podium-card.first{border-top:4px solid #f39c12;}
.podium-card.second{border-top:4px solid #aaa;}
.podium-card.third{border-top:4px solid #cd7f32;}
.podium-medal{font-size:36px;margin-bottom:8px;}
.podium-nom{font-size:13px;font-weight:800;color:#2c2c2c;margin-bottom:4px;}
.podium-note{font-size:24px;font-weight:900;color:#4d553d;}
.podium-detail{font-size:11px;color:#aaa;margin-top:4px;}
</style>
</head>
<body>
<header>
  <div><h1>BCEG — Satisfaction Client</h1><p>Tableau de bord back-office — Mis a jour en temps reel</p></div>
  <div class="hdate"><b>${today}</b>Banque pour le Commerce et l'Entrepreneuriat du Gabon</div>
</header>
<div class="tabs">
  <div class="tab active" onclick="showTab('sat',this)">📊 Satisfaction</div>
  <div class="tab" onclick="showTab('commerciaux',this)">👔 Commerciaux</div>
  <div class="tab" onclick="showTab('rec',this)">⚠️ Reclamations <span class="badge-tab">${recNouv}</span></div>
</div>
<div class="container">

  <!-- TAB SATISFACTION -->
  <div class="tab-content active" id="tab-sat">
    ${recNouv>0?'<div class="alerte">⚠️ <b>'+recNouv+' nouvelle(s) reclamation(s)</b> en attente — Consultez l\'onglet Reclamations.</div>':''}
    <div class="kpi-grid">
      <div class="kpi v"><div class="ico">📋</div><div class="lb">Reponses recues</div><div class="vl">${total}</div><div class="sb">enquetes completees</div></div>
      <div class="kpi b"><div class="ico">⭐</div><div class="lb">Satisfaction globale</div><div class="vl">${moy('note_globale')}<span style="font-size:20px;font-weight:400;">/5</span></div><div class="sb">note moyenne</div></div>
      <div class="kpi ${nps>=30?'v':nps>=0?'j':'r'}"><div class="ico">🎯</div><div class="lb">Score NPS</div><div class="vl" style="color:${npsColor};">${nps}</div><div class="sb">Net Promoter Score</div></div>
      <div class="kpi p"><div class="ico">👔</div><div class="lb">Commerciaux evalues</div><div class="vl">${Object.keys(gestionnaires).length}</div><div class="sb">gestionnaires notes</div></div>
      <div class="kpi o"><div class="ico">⚠️</div><div class="lb">Reclamations</div><div class="vl">${reclamations.length}</div><div class="sb">${recNouv} nouvelle(s)</div></div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="card-hdr"><h3>📈 Notes moyennes par critere</h3></div>
        ${[['😊 Accueil','note_accueil'],['⏱️ Attente','note_attente'],['🤝 Conseiller','note_conseiller'],['⚡ Traitement','note_traitement'],['📱 Services digitaux','note_applications'],['⭐ Satisfaction globale','note_globale']].map(function(c){
          var v=parseFloat(moy(c[1]));var col=v>=4?'#27ae60':v>=3?'#f39c12':'#e74c3c';
          return '<div class="cr-row"><div class="cr-lb">'+c[0]+'</div><div class="cr-bg"><div class="cr-bar" style="width:'+(v/5*100)+'%;background:'+col+';"></div></div><div class="cr-vl" style="color:'+col+';">'+moy(c[1])+'/5</div></div>';
        }).join('')}
      </div>
      <div class="card" style="text-align:center;">
        <div class="card-hdr"><h3>🎯 NPS — Net Promoter Score</h3></div>
        <div class="nps-sc" style="color:${npsColor};">${nps}</div>
        <div class="nps-sub">Net Promoter Score</div>
        <div class="nps-bars">
          <div class="nps-b"><div class="nb" style="color:#27ae60;">${promoteurs}</div><div class="lb2">Promoteurs<br>9-10</div></div>
          <div class="nps-b"><div class="nb" style="color:#f39c12;">${neutres}</div><div class="lb2">Neutres<br>7-8</div></div>
          <div class="nps-b"><div class="nb" style="color:#e74c3c;">${detracteurs}</div><div class="lb2">Detracteurs<br>0-6</div></div>
        </div>
      </div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="card-hdr"><h3>📅 Evolution sur 7 jours</h3></div>
        <div class="chart-container">${chartBars}</div>
        <div style="text-align:center;font-size:11px;color:#aaa;margin-top:12px;">Reponses par jour — Survolez pour les details</div>
      </div>
      <div class="card">
        <div class="card-hdr"><h3>🏦 Satisfaction par agence</h3></div>
        ${Object.keys(agences).length===0?'<div class="empty">Aucune donnee</div>':agenceRows}
      </div>
    </div>
    <div class="card">
      <div class="card-hdr"><h3>📋 Historique des questionnaires</h3><a href="/dashboard/export-satisfaction" class="export-btn">⬇️ Exporter CSV</a></div>
      ${total===0?'<div class="empty">Aucune reponse pour l\'instant</div>':'<div style="overflow-x:auto;"><table><thead><tr><th>Date</th><th>Client</th><th>Agence</th><th>Gestionnaire</th><th>Operation</th><th>Accueil</th><th>Attente</th><th>Conseil.</th><th>Global</th><th>NPS</th><th>Commentaire</th></tr></thead><tbody>'+rowsSat+'</tbody></table></div>'}
    </div>
  </div>

  <!-- TAB COMMERCIAUX -->
  <div class="tab-content" id="tab-commerciaux">
    <div class="kpi-grid">
      <div class="kpi p"><div class="ico">👔</div><div class="lb">Commerciaux evalues</div><div class="vl">${Object.keys(gestionnaires).length}</div><div class="sb">gestionnaires notes par les clients</div></div>
      <div class="kpi v"><div class="ico">⭐</div><div class="lb">Meilleure note accueil</div><div class="vl">${Object.keys(gestionnaires).length>0?Math.max.apply(null,Object.values(gestionnaires).map(function(d){return d.total>0?parseFloat((d.accueil/d.total).toFixed(1)):0;})).toFixed(1):'—'}<span style="font-size:20px;font-weight:400;">/5</span></div><div class="sb">meilleur commercial</div></div>
      <div class="kpi b"><div class="ico">🤝</div><div class="lb">Meilleure note conseil</div><div class="vl">${Object.keys(gestionnaires).length>0?Math.max.apply(null,Object.values(gestionnaires).map(function(d){return d.total>0?parseFloat((d.conseiller/d.total).toFixed(1)):0;})).toFixed(1):'—'}<span style="font-size:20px;font-weight:400;">/5</span></div><div class="sb">meilleur commercial</div></div>
      <div class="kpi v"><div class="ico">📊</div><div class="lb">Total evaluations</div><div class="vl">${total}</div><div class="sb">reponses clients</div></div>
    </div>

    ${Object.keys(gestionnaires).length>0?`
    <div class="podium">
      ${Object.entries(gestionnaires).sort(function(a,b){return (b[1].globale/b[1].total)-(a[1].globale/a[1].total);}).slice(0,3).map(function(entry,i){
        var medals=['🥇','🥈','🥉'];
        var classes=['first','second','third'];
        var d=entry[1];
        var m=(d.globale/d.total).toFixed(1);
        return '<div class="podium-card '+classes[i]+'"><div class="podium-medal">'+medals[i]+'</div><div class="podium-nom">'+entry[0]+'</div><div class="podium-note">'+m+'/5</div><div class="podium-detail">'+d.total+' evaluation(s)</div></div>';
      }).join('')}
    </div>`:''}

    <div class="card">
      <div class="card-hdr"><h3>👔 Performance des commerciaux — Classement</h3><a href="/dashboard/export-commerciaux" class="export-btn">⬇️ Exporter CSV</a></div>
      ${Object.keys(gestionnaires).length===0?'<div class="empty">Aucune evaluation disponible<br><span style="font-size:12px;">Les evaluations apparaitront quand les clients repondront aux questionnaires</span></div>':
      '<div style="overflow-x:auto;"><table><thead><tr><th>Classement & Nom</th><th style="text-align:center;">Note Accueil</th><th style="text-align:center;">Note Conseil</th><th style="text-align:center;">Note Globale</th><th style="text-align:center;">NPS Moyen</th><th style="text-align:center;">Evaluations</th></tr></thead><tbody>'+rowsGest+'</tbody></table></div>'}
    </div>
  </div>

  <!-- TAB RECLAMATIONS -->
  <div class="tab-content" id="tab-rec">
    <div class="kpi-grid">
      <div class="kpi r"><div class="ico">🔴</div><div class="lb">Nouvelles</div><div class="vl">${recNouv}</div><div class="sb">a traiter en priorite</div></div>
      <div class="kpi j"><div class="ico">🟡</div><div class="lb">En cours</div><div class="vl">${recEnCours}</div><div class="sb">en traitement</div></div>
      <div class="kpi v"><div class="ico">🟢</div><div class="lb">Resolues</div><div class="vl">${recResolue}</div><div class="sb">terminees</div></div>
      <div class="kpi b"><div class="ico">📋</div><div class="lb">Total</div><div class="vl">${reclamations.length}</div><div class="sb">reclamations recues</div></div>
    </div>
    <div class="card">
      <div class="card-hdr"><h3>📋 Liste des reclamations</h3><a href="/dashboard/export-reclamations" class="export-btn">⬇️ Exporter CSV</a></div>
      ${reclamations.length===0?'<div class="empty">Aucune reclamation pour l\'instant ✅</div>':
      '<div style="overflow-x:auto;"><table><thead><tr><th>N° Suivi</th><th>Date</th><th>Client</th><th>Tel</th><th>Agence</th><th>Categorie</th><th>Description</th><th>Fichier</th><th>Statut</th></tr></thead><tbody>'+rowsRec+'</tbody></table></div>'}
    </div>
  </div>

</div>
<script>
function showTab(name,el){document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active');});el.classList.add('active');document.getElementById('tab-'+name).classList.add('active');}
function maj(id,statut){fetch('/dashboard/statut',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,statut:statut})});}
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

router.get('/export-satisfaction', function(req, res) {
  db.all(`SELECT r.date_reponse,c.nom,c.prenom,a.nom as agence,o.type_operation,o.nom_gestionnaire,
          r.note_accueil,r.note_attente,r.note_conseiller,r.note_traitement,r.note_applications,r.note_globale,r.score_nps,r.commentaire
          FROM reponses r
          LEFT JOIN enquetes e ON e.id=r.enquete_id
          LEFT JOIN operations o ON o.id=e.operation_id
          LEFT JOIN clients c ON c.id=o.client_id
          LEFT JOIN agences a ON a.id=c.agence_id
          ORDER BY r.date_reponse DESC`, [], function(err, rows) {
    rows=rows||[];
    var csv='Date,Nom,Prenom,Agence,Operation,Gestionnaire,Accueil,Attente,Conseiller,Traitement,Digitaux,Global,NPS,Commentaire\n';
    rows.forEach(function(r){
      csv+=[(r.date_reponse||'').toString().substring(0,10),r.nom||'',r.prenom||'',r.agence||'',
            r.type_operation||'',r.nom_gestionnaire||'',r.note_accueil||'',r.note_attente||'',
            r.note_conseiller||'',r.note_traitement||'',r.note_applications||'',r.note_globale||'',
            r.score_nps||'','"'+(r.commentaire||'').replace(/"/g,'""')+'"'].join(',')+'\n';
    });
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="BCEG_Satisfaction_'+new Date().toISOString().substring(0,10)+'.csv"');
    res.send('\uFEFF'+csv);
  });
});

router.get('/export-commerciaux', function(req, res) {
  db.all(`SELECT o.nom_gestionnaire, o.code_gestionnaire, a.nom as agence,
          AVG(r.note_accueil) as moy_accueil, AVG(r.note_conseiller) as moy_conseiller,
          AVG(r.note_globale) as moy_globale, AVG(r.score_nps) as moy_nps, COUNT(r.id) as nb_eval
          FROM reponses r
          LEFT JOIN enquetes e ON e.id=r.enquete_id
          LEFT JOIN operations o ON o.id=e.operation_id
          LEFT JOIN agences a ON a.id=o.agence_id
          WHERE o.nom_gestionnaire IS NOT NULL AND o.nom_gestionnaire != ''
          GROUP BY o.nom_gestionnaire
          ORDER BY moy_globale DESC`, [], function(err, rows) {
    rows=rows||[];
    var csv='Gestionnaire,Code,Agence,Moy Accueil,Moy Conseiller,Moy Globale,Moy NPS,Nb Evaluations\n';
    rows.forEach(function(r){
      csv+=[(r.nom_gestionnaire||''),r.code_gestionnaire||'',r.agence||'',
            parseFloat(r.moy_accueil||0).toFixed(1),parseFloat(r.moy_conseiller||0).toFixed(1),
            parseFloat(r.moy_globale||0).toFixed(1),parseFloat(r.moy_nps||0).toFixed(1),r.nb_eval||0].join(',')+'\n';
    });
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="BCEG_Commerciaux_'+new Date().toISOString().substring(0,10)+'.csv"');
    res.send('\uFEFF'+csv);
  });
});

router.get('/export-reclamations', function(req, res) {
  db.all("SELECT * FROM reclamations ORDER BY date_reception DESC", [], function(err, rows) {
    rows=rows||[];
    var csv='N Suivi,Date,Client,Telephone,Email,Agence,Categorie,Description,Fichier,Statut\n';
    rows.forEach(function(r){
      csv+=[r.numero_suivi||'',(r.date_reception||'').toString().substring(0,10),
            r.nom_client||'',r.telephone||'',r.email||'',r.agence||'',r.categorie||'',
            '"'+(r.description||'').replace(/"/g,'""')+'"',r.fichier_nom||'',r.statut||''].join(',')+'\n';
    });
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="BCEG_Reclamations_'+new Date().toISOString().substring(0,10)+'.csv"');
    res.send('\uFEFF'+csv);
  });
});

module.exports = router;
