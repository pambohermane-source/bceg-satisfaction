const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/', function(req, res) {
  db.all("SELECT * FROM reponses ORDER BY date_reponse DESC", [], function(err, reponses) {
    reponses = reponses || [];
    db.all("SELECT * FROM reclamations ORDER BY date_reception DESC", [], function(err2, reclamations) {
      reclamations = reclamations || [];

      var total = reponses.length;
      function moy(field) {
        if (total === 0) return '0.0';
        var sum = reponses.reduce(function(s, r) { return s + (r[field] || 0); }, 0);
        return (sum / total).toFixed(1);
      }
      var promoteurs = reponses.filter(function(r) { return r.score_nps >= 9; }).length;
      var detracteurs = reponses.filter(function(r) { return r.score_nps <= 6; }).length;
      var neutres = reponses.filter(function(r) { return r.score_nps >= 7 && r.score_nps <= 8; }).length;
      var nps = total > 0 ? Math.round(((promoteurs - detracteurs) / total) * 100) : 0;
      var recNouv = reclamations.filter(function(r) { return r.statut === 'Nouvelle'; }).length;
      var recEnCours = reclamations.filter(function(r) { return r.statut === 'En cours'; }).length;
      var recResolue = reclamations.filter(function(r) { return r.statut === 'Resolue'; }).length;

      var rows10 = reponses.slice(0, 15).map(function(r) {
        var npsClass = r.score_nps >= 9 ? 'pro' : r.score_nps >= 7 ? 'neu' : 'det';
        var npsLbl = r.score_nps >= 9 ? 'Pro' : r.score_nps >= 7 ? 'Neutre' : 'Det';
        return '<tr><td>' + (r.date_reponse || '-').toString().substring(0,10) + '</td><td>' + (r.note_accueil||'-') + '/5</td><td>' + (r.note_attente||'-') + '/5</td><td>' + (r.note_conseiller||'-') + '/5</td><td>' + (r.note_traitement||'-') + '/5</td><td><b>' + (r.note_globale||'-') + '/5</b></td><td><span class="badge ' + npsClass + '">' + (r.score_nps !== null ? r.score_nps : '-') + ' ' + npsLbl + '</span></td><td>' + (r.commentaire ? r.commentaire.substring(0,50) : '-') + '</td></tr>';
      }).join('');

      var rowsRec = reclamations.map(function(r) {
        var fichierBtn = r.fichier_path ? '<a href="/enquete/fichier/' + r.fichier_path + '" target="_blank" class="btn-f">Voir</a>' : '-';
        return '<tr><td><b>' + r.numero_suivi + '</b></td><td>' + (r.date_reception||'-').toString().substring(0,10) + '</td><td>' + r.nom_client + '</td><td>' + (r.telephone||'-') + '</td><td>' + (r.agence||'-') + '</td><td>' + (r.categorie||'-') + '</td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (r.description||'-').substring(0,50) + '</td><td>' + fichierBtn + '</td><td><select onchange="maj(' + r.id + ',this.value)"><option' + (r.statut==='Nouvelle'?' selected':'') + '>Nouvelle</option><option' + (r.statut==='En cours'?' selected':'') + '>En cours</option><option' + (r.statut==='Resolue'?' selected':'') + '>Resolue</option></select></td></tr>';
      }).join('');

      res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Dashboard BCEG</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;background:#f3f6f3;color:#2c2c2c;}header{background:#4d553d;color:white;padding:16px 28px;display:flex;align-items:center;justify-content:space-between;}header h1{font-size:22px;font-weight:bold;}header p{font-size:12px;color:#c8d4c8;}.tabs{background:#3a4130;display:flex;padding:0 28px;}.tab{padding:14px 22px;color:#a6aa9e;cursor:pointer;font-size:14px;font-weight:bold;border-bottom:3px solid transparent;}.tab.active{color:white;border-bottom-color:#a6aa9e;}.container{max-width:1100px;margin:0 auto;padding:24px 16px;}.tab-content{display:none;}.tab-content.active{display:block;}.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;}.kpi{background:white;border-radius:10px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,0.07);border-top:4px solid #4d553d;}.kpi.or{border-top-color:#c0622a;}.kpi.ro{border-top-color:#e74c3c;}.kpi .lb{font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}.kpi .vl{font-size:34px;font-weight:bold;color:#4d553d;}.kpi.or .vl{color:#c0622a;}.kpi.ro .vl{color:#e74c3c;}.kpi .sb{font-size:12px;color:#888;margin-top:4px;}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}@media(max-width:700px){.grid2{grid-template-columns:1fr;}}.card{background:white;border-radius:10px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.07);margin-bottom:20px;}.card h3{font-size:15px;color:#4d553d;margin-bottom:16px;font-weight:bold;}.cr{display:flex;align-items:center;margin-bottom:10px;}.cr-lb{width:170px;font-size:13px;color:#555;flex-shrink:0;}.cr-bg{flex:1;background:#e8ede8;border-radius:6px;height:10px;margin:0 10px;}.cr-bar{height:10px;border-radius:6px;background:#4d553d;}.cr-vl{font-size:13px;font-weight:bold;color:#4d553d;width:36px;text-align:right;}.nps-box{text-align:center;}.nps-sc{font-size:70px;font-weight:bold;color:#4d553d;line-height:1;}.nps-lb{font-size:12px;color:#888;margin-top:4px;}.nps-bars{display:flex;gap:10px;margin-top:18px;}.nps-b{flex:1;text-align:center;}.nps-b .nb{font-size:22px;font-weight:bold;}.nps-b .lb2{font-size:11px;color:#888;margin-top:4px;}.pro{color:#27ae60;}.neu{color:#f39c12;}.det{color:#e74c3c;}table{width:100%;border-collapse:collapse;font-size:12px;}th{background:#4d553d;color:white;padding:10px 10px;text-align:left;}td{padding:9px 10px;border-bottom:1px solid #eee;}tr:hover td{background:#f9f9f7;}.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;}.badge.pro{background:#e8f5e9;color:#27ae60;}.badge.neu{background:#fef3e2;color:#f39c12;}.badge.det{background:#fde8e8;color:#e74c3c;}.alerte{background:#fde8e8;border-left:4px solid #e74c3c;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#c0392b;}.btn-f{background:#4d553d;color:white;border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;text-decoration:none;}select{padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;}.empty{text-align:center;color:#aaa;padding:40px;font-size:14px;}</style></head><body>'
      + '<header><div><h1>BCEG — Satisfaction Client</h1><p>Tableau de bord — Mis a jour en temps reel</p></div><div style="font-size:12px;color:#c8d4c8;text-align:right;">Banque pour le Commerce et l\'Entrepreneuriat du Gabon</div></header>'
      + '<div class="tabs"><div class="tab active" onclick="showTab(\'sat\',this)">Satisfaction Client</div><div class="tab" onclick="showTab(\'rec\',this)">Reclamations <span style="background:#e74c3c;color:white;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px;">' + recNouv + '</span></div></div>'
      + '<div class="container">'

      // SATISFACTION TAB
      + '<div class="tab-content active" id="tab-sat">'
      + (recNouv > 0 ? '<div class="alerte"><b>' + recNouv + ' nouvelle(s) reclamation(s) en attente</b> — Consultez l\'onglet Reclamations.</div>' : '')
      + '<div class="kpi-grid">'
      + '<div class="kpi"><div class="lb">Reponses recues</div><div class="vl">' + total + '</div><div class="sb">enquetes completees</div></div>'
      + '<div class="kpi"><div class="lb">Satisfaction globale</div><div class="vl">' + moy('note_globale') + '<span style="font-size:18px;">/5</span></div><div class="sb">note moyenne</div></div>'
      + '<div class="kpi or"><div class="lb">Score NPS</div><div class="vl">' + nps + '</div><div class="sb">Net Promoter Score</div></div>'
      + '<div class="kpi ro"><div class="lb">Reclamations</div><div class="vl">' + reclamations.length + '</div><div class="sb">' + recNouv + ' nouvelle(s)</div></div>'
      + '</div>'
      + '<div class="grid2">'
      + '<div class="card"><h3>Notes moyennes par critere</h3>'
      + [['Accueil', 'note_accueil'],['Temps attente','note_attente'],['Conseiller','note_conseiller'],['Traitement','note_traitement'],['Services digitaux','note_applications'],['Satisfaction globale','note_globale']].map(function(c){
          return '<div class="cr"><div class="cr-lb">'+c[0]+'</div><div class="cr-bg"><div class="cr-bar" style="width:'+(parseFloat(moy(c[1]))/5*100)+'%"></div></div><div class="cr-vl">'+moy(c[1])+'/5</div></div>';
        }).join('')
      + '</div>'
      + '<div class="card nps-box"><h3>NPS — Net Promoter Score</h3><div class="nps-sc">' + nps + '</div><div class="nps-lb">Score NPS</div>'
      + '<div class="nps-bars"><div class="nps-b"><div class="nb pro">' + promoteurs + '</div><div class="lb2">Promoteurs<br>9-10</div></div><div class="nps-b"><div class="nb neu">' + neutres + '</div><div class="lb2">Neutres<br>7-8</div></div><div class="nps-b"><div class="nb det">' + detracteurs + '</div><div class="lb2">Detracteurs<br>0-6</div></div></div></div>'
      + '</div>'
      + '<div class="card"><h3>Derniers questionnaires recus</h3>'
      + (total === 0 ? '<div class="empty">Aucune reponse pour l\'instant</div>' : '<table><thead><tr><th>Date</th><th>Accueil</th><th>Attente</th><th>Conseiller</th><th>Traitement</th><th>Global</th><th>NPS</th><th>Commentaire</th></tr></thead><tbody>' + rows10 + '</tbody></table>')
      + '</div></div>'

      // RECLAMATIONS TAB
      + '<div class="tab-content" id="tab-rec">'
      + '<div class="kpi-grid">'
      + '<div class="kpi ro"><div class="lb">Nouvelles</div><div class="vl">' + recNouv + '</div><div class="sb">a traiter</div></div>'
      + '<div class="kpi or"><div class="lb">En cours</div><div class="vl">' + recEnCours + '</div><div class="sb">en traitement</div></div>'
      + '<div class="kpi"><div class="lb">Resolues</div><div class="vl">' + recResolue + '</div><div class="sb">terminees</div></div>'
      + '<div class="kpi"><div class="lb">Total</div><div class="vl">' + reclamations.length + '</div><div class="sb">reclamations</div></div>'
      + '</div>'
      + '<div class="card"><h3>Liste des reclamations</h3>'
      + (reclamations.length === 0 ? '<div class="empty">Aucune reclamation pour l\'instant</div>' : '<table><thead><tr><th>N Suivi</th><th>Date</th><th>Client</th><th>Tel</th><th>Agence</th><th>Categorie</th><th>Description</th><th>Fichier</th><th>Statut</th></tr></thead><tbody>' + rowsRec + '</tbody></table>')
      + '</div></div>'

      + '</div>'
      + '<script>function showTab(name,el){document.querySelectorAll(".tab").forEach(function(t){t.classList.remove("active");});document.querySelectorAll(".tab-content").forEach(function(t){t.classList.remove("active");});el.classList.add("active");document.getElementById("tab-"+name).classList.add("active");}function maj(id,statut){fetch("/dashboard/statut",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id,statut:statut})});}setTimeout(function(){location.reload();},60000);</script>'
      + '</body></html>');
    });
  });
});

router.post('/statut', function(req, res) {
  var id = req.body.id;
  var statut = req.body.statut;
  db.run("UPDATE reclamations SET statut = ? WHERE id = ?", [statut, id], function(err) {
    if (err) return res.status(500).json({ error: 'Erreur' });
    res.json({ success: true });
  });
});

module.exports = router;
