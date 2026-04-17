const express = require('express');
const router = express.Router();
const db = require('../models/database');
const path = require('path');

router.get('/', (req, res) => {
  db.all(`SELECT r.*, e.date_envoi, o.type_operation, c.nom, c.prenom, a.nom as agence_nom
          FROM reponses r
          LEFT JOIN enquetes e ON e.id = r.enquete_id
          LEFT JOIN operations o ON o.id = e.operation_id
          LEFT JOIN clients c ON c.id = o.client_id
          LEFT JOIN agences a ON a.id = c.agence_id
          ORDER BY r.date_reponse DESC`, [], (err, reponses) => {

    db.all(`SELECT * FROM reclamations ORDER BY date_reception DESC`, [], (err2, reclamations) => {
      reclamations = reclamations || [];
      reponses = reponses || [];

      const total = reponses.length;
      const moy = (field) => total > 0 ? (reponses.reduce((s, r) => s + (r[field] || 0), 0) / total).toFixed(1) : '0.0';
      const promoteurs = reponses.filter(r => r.score_nps >= 9).length;
      const detracteurs = reponses.filter(r => r.score_nps <= 6).length;
      const neutres = reponses.filter(r => r.score_nps >= 7 && r.score_nps <= 8).length;
      const nps = total > 0 ? Math.round(((promoteurs - detracteurs) / total) * 100) : 0;

      const recNouv = reclamations.filter(r => r.statut === 'Nouvelle').length;
      const recEnCours = reclamations.filter(r => r.statut === 'En cours').length;
      const recResolue = reclamations.filter(r => r.statut === 'Resolue').length;

      const agences = {};
      reponses.forEach(r => {
        const ag = r.agence_nom || 'Non renseigne';
        if (!agences[ag]) agences[ag] = { total: 0, somme: 0 };
        agences[ag].total++;
        agences[ag].somme += r.note_globale || 0;
      });

      res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - BCEG Satisfaction Client</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f3f6f3; color: #2c2c2c; }

    header { background: #4d553d; color: white; padding: 16px 28px; display: flex; align-items: center; justify-content: space-between; }
    header h1 { font-size: 24px; font-weight: bold; }
    header p { font-size: 12px; color: #c8d4c8; margin-top: 2px; }
    .header-right { text-align: right; font-size: 12px; color: #c8d4c8; }

    .tabs { background: #3a4130; display: flex; padding: 0 28px; }
    .tab { padding: 14px 24px; color: #a6aa9e; cursor: pointer; font-size: 14px; font-weight: bold; border-bottom: 3px solid transparent; transition: all 0.2s; }
    .tab:hover { color: white; }
    .tab.active { color: white; border-bottom-color: #a6aa9e; }

    .container { max-width: 1100px; margin: 0 auto; padding: 28px 20px; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .kpi-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); border-top: 4px solid #4d553d; }
    .kpi-card .label { font-size: 11px; color: #a6aa9e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .kpi-card .value { font-size: 36px; font-weight: bold; color: #4d553d; }
    .kpi-card .sub { font-size: 12px; color: #888; margin-top: 4px; }
    .kpi-card.orange { border-top-color: #c0622a; }
    .kpi-card.orange .value { color: #c0622a; }
    .kpi-card.rouge { border-top-color: #e74c3c; }
    .kpi-card.rouge .value { color: #e74c3c; }

    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    @media(max-width: 700px) { .grid2 { grid-template-columns: 1fr; } }

    .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); margin-bottom: 20px; }
    .card h3 { font-size: 15px; color: #4d553d; margin-bottom: 16px; font-weight: bold; }

    .critere-row { display: flex; align-items: center; margin-bottom: 12px; }
    .critere-label { width: 180px; font-size: 13px; color: #555; flex-shrink: 0; }
    .critere-bar-bg { flex: 1; background: #e8ede8; border-radius: 6px; height: 10px; margin: 0 12px; }
    .critere-bar { height: 10px; border-radius: 6px; background: #4d553d; transition: width 0.5s; }
    .critere-val { font-size: 13px; font-weight: bold; color: #4d553d; width: 36px; text-align: right; }

    .nps-box { text-align: center; }
    .nps-score { font-size: 72px; font-weight: bold; color: #4d553d; line-height: 1; }
    .nps-label { font-size: 13px; color: #888; margin-top: 4px; }
    .nps-bars { display: flex; gap: 10px; margin-top: 20px; }
    .nps-bar { flex: 1; text-align: center; }
    .nps-bar .nb { font-size: 22px; font-weight: bold; }
    .nps-bar .lb { font-size: 11px; color: #888; margin-top: 4px; }
    .promoteur { color: #27ae60; }
    .neutre { color: #f39c12; }
    .detracteur { color: #e74c3c; }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #4d553d; color: white; padding: 10px 12px; text-align: left; font-weight: bold; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    tr:hover td { background: #f9f9f7; }

    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
    .badge-nouvelle { background: #fde8e8; color: #e74c3c; }
    .badge-encours { background: #fef3e2; color: #f39c12; }
    .badge-resolue { background: #e8f5e9; color: #27ae60; }
    .badge-nps-pro { background: #e8f5e9; color: #27ae60; }
    .badge-nps-neu { background: #fef3e2; color: #f39c12; }
    .badge-nps-det { background: #fde8e8; color: #e74c3c; }

    .select-statut { padding: 4px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; }
    .btn-fichier { background: #4d553d; color: white; border: none; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; text-decoration: none; }
    .btn-fichier:hover { background: #3a4130; }

    .agence-row { display: flex; align-items: center; margin-bottom: 10px; }
    .agence-nom { width: 200px; font-size: 13px; color: #333; flex-shrink: 0; }
    .agence-bar-bg { flex: 1; background: #e8ede8; border-radius: 6px; height: 12px; margin: 0 12px; }
    .agence-bar { height: 12px; border-radius: 6px; background: #4d553d; }
    .agence-val { font-size: 13px; font-weight: bold; color: #4d553d; width: 50px; text-align: right; }

    .alerte { background: #fde8e8; border-left: 4px solid #e74c3c; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: #c0392b; }
    .alerte strong { display: block; margin-bottom: 4px; }

    .empty { text-align: center; color: #aaa; padding: 40px; font-size: 14px; }
  </style>
</head>
<body>

<header>
  <div>
    <h1>BCEG — Satisfaction Client</h1>
    <p>Tableau de bord — Mis a jour en temps reel</p>
  </div>
  <div class="header-right">
    <div style="font-size:18px;font-weight:bold;">${new Date().toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'})}</div>
    <div style="margin-top:4px;">Banque pour le Commerce et l'Entrepreneuriat du Gabon</div>
  </div>
</header>

<div class="tabs">
  <div class="tab active" onclick="showTab('satisfaction')">📊 Satisfaction Client</div>
  <div class="tab" onclick="showTab('reclamations')">⚠️ Reclamations <span style="background:#e74c3c;color:white;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px;">${recNouv}</span></div>
</div>

<div class="container">

  <!-- ONGLET SATISFACTION -->
  <div class="tab-content active" id="tab-satisfaction">

    ${recNouv > 0 ? `<div class="alerte"><strong>⚠️ ${recNouv} nouvelle(s) reclamation(s) en attente</strong>Consultez l'onglet "Reclamations" pour les traiter.</div>` : ''}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Reponses recues</div>
        <div class="value">${total}</div>
        <div class="sub">enquetes completees</div>
      </div>
      <div class="kpi-card">
        <div class="label">Satisfaction globale</div>
        <div class="value">${moy('note_globale')}<span style="font-size:18px;">/5</span></div>
        <div class="sub">note moyenne</div>
      </div>
      <div class="kpi-card ${nps >= 30 ? '' : nps >= 0 ? 'orange' : 'rouge'}">
        <div class="label">Score NPS</div>
        <div class="value">${nps}</div>
        <div class="sub">Net Promoter Score</div>
      </div>
      <div class="kpi-card orange">
        <div class="label">Reclamations</div>
        <div class="value">${reclamations.length}</div>
        <div class="sub">${recNouv} nouvelle(s)</div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h3>📈 Notes moyennes par critere</h3>
        ${[
          ['Accueil en agence', moy('note_accueil')],
          ['Temps d\'attente', moy('note_attente')],
          ['Qualite du conseiller', moy('note_conseiller')],
          ['Traitement demande', moy('note_traitement')],
          ['Services digitaux', moy('note_applications')],
          ['Satisfaction globale', moy('note_globale')]
        ].map(([label, val]) => `
          <div class="critere-row">
            <div class="critere-label">${label}</div>
            <div class="critere-bar-bg"><div class="critere-bar" style="width:${(val/5)*100}%"></div></div>
            <div class="critere-val">${val}/5</div>
          </div>
        `).join('')}
      </div>

      <div class="card nps-box">
        <h3>🎯 NPS — Net Promoter Score</h3>
        <div class="nps-score">${nps}</div>
        <div class="nps-label">Score NPS</div>
        <div class="nps-bars">
          <div class="nps-bar"><div class="nb promoteur">${promoteurs}</div><div class="lb">Promoteurs<br>9-10</div></div>
          <div class="nps-bar"><div class="nb neutre">${neutres}</div><div class="lb">Neutres<br>7-8</div></div>
          <div class="nps-bar"><div class="nb detracteur">${detracteurs}</div><div class="lb">Detracteurs<br>0-6</div></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>🏦 Satisfaction par agence</h3>
      ${Object.keys(agences).length === 0 ? '<div class="empty">Aucune donnee disponible</div>' :
        Object.entries(agences).map(([nom, data]) => {
          const moy2 = (data.somme / data.total).toFixed(1);
          return `<div class="agence-row">
            <div class="agence-nom">${nom}</div>
            <div class="agence-bar-bg"><div class="agence-bar" style="width:${(moy2/5)*100}%"></div></div>
            <div class="agence-val">${moy2}/5 <span style="color:#aaa;font-size:11px;">(${data.total})</span></div>
          </div>`;
        }).join('')
      }
    </div>

    <div class="card">
      <h3>📋 Derniers questionnaires recus</h3>
      ${reponses.length === 0 ? '<div class="empty">Aucune reponse pour l\'instant</div>' : `
      <table>
        <thead><tr>
          <th>Date</th><th>Client</th><th>Agence</th><th>Operation</th>
          <th>Accueil</th><th>Attente</th><th>Conseiller</th><th>Global</th><th>NPS</th>
        </tr></thead>
        <tbody>
          ${reponses.slice(0, 20).map(r => {
            const npsClass = r.score_nps >= 9 ? 'badge-nps-pro' : r.score_nps >= 7 ? 'badge-nps-neu' : 'badge-nps-det';
            const npsLabel = r.score_nps >= 9 ? 'Pro' : r.score_nps >= 7 ? 'Neutre' : 'Det';
            return `<tr>
              <td>${r.date_reponse ? r.date_reponse.split('T')[0] : '-'}</td>
              <td>${r.prenom || 'Demo'} ${r.nom || ''}</td>
              <td>${r.agence_nom || '-'}</td>
              <td>${r.type_operation || '-'}</td>
              <td>${r.note_accueil || '-'}/5</td>
              <td>${r.note_attente || '-'}/5</td>
              <td>${r.note_conseiller || '-'}/5</td>
              <td><strong>${r.note_globale || '-'}/5</strong></td>
              <td><span class="badge ${npsClass}">${r.score_nps !== null ? r.score_nps : '-'} ${npsLabel}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`}
    </div>
  </div>

  <!-- ONGLET RECLAMATIONS -->
  <div class="tab-content" id="tab-reclamations">

    <div class="kpi-grid">
      <div class="kpi-card rouge">
        <div class="label">Nouvelles</div>
        <div class="value">${recNouv}</div>
        <div class="sub">a traiter</div>
      </div>
      <div class="kpi-card orange">
        <div class="label">En cours</div>
        <div class="value">${recEnCours}</div>
        <div class="sub">en traitement</div>
      </div>
      <div class="kpi-card">
        <div class="label">Resolues</div>
        <div class="value">${recResolue}</div>
        <div class="sub">terminees</div>
      </div>
      <div class="kpi-card">
        <div class="label">Total</div>
        <div class="value">${reclamations.length}</div>
        <div class="sub">reclamations</div>
      </div>
    </div>

    <div class="card">
      <h3>📋 Liste des reclamations</h3>
      ${reclamations.length === 0 ? '<div class="empty">Aucune reclamation pour l\'instant</div>' : `
      <table>
        <thead><tr>
          <th>N° Suivi</th><th>Date</th><th>Client</th><th>Telephone</th>
          <th>Agence</th><th>Categorie</th><th>Description</th><th>Document</th><th>Statut</th>
        </tr></thead>
        <tbody>
          ${reclamations.map(r => `<tr>
            <td><strong>${r.numero_suivi}</strong></td>
            <td>${r.date_reception ? r.date_reception.split('T')[0] : '-'}</td>
            <td>${r.nom_client}</td>
            <td>${r.telephone || '-'}</td>
            <td>${r.agence || '-'}</td>
            <td>${r.categorie || '-'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.description || ''}">${r.description ? r.description.substring(0, 60) + (r.description.length > 60 ? '...' : '') : '-'}</td>
            <td>${r.fichier_nom ? `<a href="/enquete/fichier/${r.fichier_path}" class="btn-fichier" target="_blank">📎 Voir</a>` : '-'}</td>
            <td>
              <select class="select-statut" onchange="changerStatut(${r.id}, this.value)">
                <option value="Nouvelle" ${r.statut === 'Nouvelle' ? 'selected' : ''}>🔴 Nouvelle</option>
                <option value="En cours" ${r.statut === 'En cours' ? 'selected' : ''}>🟡 En cours</option>
                <option value="Resolue" ${r.statut === 'Resolue' ? 'selected' : ''}>🟢 Resolue</option>
              </select>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>
  </div>

</div>

<script>
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
    event.target.classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
  }

  function changerStatut(id, statut) {
    fetch('/enquete/reclamation/statut', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut })
    }).then(function() {
      console.log('Statut mis a jour');
    });
  }

  setTimeout(function() { location.reload(); }, 60000);
</script>
</body>
</html>`);
    });
  });
});

// CHANGER STATUT RECLAMATION
router.post('/reclamation/statut', (req, res) => {
  const { id, statut } = req.body;
  db.run(`UPDATE reclamations SET statut = ?, date_traitement = datetime('now') WHERE id = ?`,
    [statut, id],
    function(err) {
      if (err) return res.status(500).json({ error: 'Erreur' });
      res.json({ success: true });
    }
  );
});

// SERVIR LES FICHIERS DE RECLAMATION
router.get('/fichier/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'uploads', req.params.filename);
  res.sendFile(filePath);
});

module.exports = router;
