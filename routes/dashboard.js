const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/', (req, res) => {
  db.all(`SELECT * FROM reponses`, [], (err, reponses) => {
    db.all(`SELECT * FROM clients`, [], (err2, clients) => {
      
      const total = reponses.length;
      const moy = (champ) => total ? (reponses.reduce((s, r) => s + (r[champ] || 0), 0) / total).toFixed(1) : 0;
      
      const npsScores = reponses.filter(r => r.score_nps !== null);
      const promoteurs = npsScores.filter(r => r.score_nps >= 9).length;
      const detracteurs = npsScores.filter(r => r.score_nps <= 6).length;
      const nps = npsScores.length ? Math.round(((promoteurs - detracteurs) / npsScores.length) * 100) : 0;

      res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dashboard - BCEG Satisfaction</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; background: #f0f2f0; color: #2d2d2d; }
            
            .header { background: #4d553d; color: white; padding: 20px 40px; display: flex; align-items: center; justify-content: space-between; }
            .header h1 { font-size: 28px; font-weight: 900; letter-spacing: 2px; }
            .header p { font-size: 13px; opacity: 0.8; }
            .slogan { font-size: 12px; opacity: 0.7; font-style: italic; }
            
            .container { padding: 30px 40px; }
            
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
            .kpi-card { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #4d553d; }
            .kpi-card .label { font-size: 12px; color: #a6aa9e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
            .kpi-card .value { font-size: 36px; font-weight: 900; color: #4d553d; }
            .kpi-card .sub { font-size: 12px; color: #a6aa9e; margin-top: 5px; }
            
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .card h3 { color: #4d553d; font-size: 16px; font-weight: 700; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #f0f2f0; }
            
            .bar-item { margin-bottom: 15px; }
            .bar-label { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; }
            .bar-track { background: #f0f2f0; border-radius: 10px; height: 10px; }
            .bar-fill { background: #4d553d; border-radius: 10px; height: 10px; transition: width 0.5s; }
            
            .nps-box { text-align: center; padding: 20px; }
            .nps-score { font-size: 72px; font-weight: 900; color: #4d553d; }
            .nps-label { font-size: 14px; color: #a6aa9e; }
            .nps-detail { display: flex; justify-content: space-around; margin-top: 20px; }
            .nps-detail div { text-align: center; }
            .nps-detail .n { font-size: 24px; font-weight: 700; }
            .nps-detail .l { font-size: 12px; color: #a6aa9e; }
            
            table { width: 100%; border-collapse: collapse; }
            th { background: #4d553d; color: white; padding: 12px 15px; text-align: left; font-size: 13px; }
            td { padding: 12px 15px; border-bottom: 1px solid #f0f2f0; font-size: 13px; }
            tr:hover td { background: #f9faf9; }
            .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
            .badge-5 { background: #d4edda; color: #155724; }
            .badge-4 { background: #d1ecf1; color: #0c5460; }
            .badge-3 { background: #fff3cd; color: #856404; }
            .badge-2 { background: #f8d7da; color: #721c24; }
            .badge-1 { background: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>BCEG</h1>
              <p class="slogan">Réinventons l'avenir</p>
            </div>
            <div style="text-align:right">
              <div style="font-size:18px;font-weight:600">Dashboard Satisfaction Client</div>
              <div style="font-size:12px;opacity:0.7">Mis à jour en temps réel</div>
            </div>
          </div>

          <div class="container">
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="label">Réponses reçues</div>
                <div class="value">${total}</div>
                <div class="sub">enquêtes complétées</div>
              </div>
              <div class="kpi-card">
                <div class="label">Satisfaction globale</div>
                <div class="value">${moy('note_globale')}/5</div>
                <div class="sub">note moyenne</div>
              </div>
              <div class="kpi-card">
                <div class="label">NPS Score</div>
                <div class="value">${nps}</div>
                <div class="sub">Net Promoter Score</div>
              </div>
              <div class="kpi-card">
                <div class="label">Clients enregistrés</div>
                <div class="value">${clients.length}</div>
                <div class="sub">dans la base</div>
              </div>
            </div>

            <div class="grid-2">
              <div class="card">
                <h3>📊 Notes moyennes par critère</h3>
                ${[
                  ['Accueil en agence', moy('note_accueil')],
                  ['Temps d\'attente', moy('note_attente')],
                  ['Conseiller', moy('note_conseiller')],
                  ['Traitement demande', moy('note_traitement')],
                  ['Services digitaux', moy('note_applications')],
                  ['Satisfaction globale', moy('note_globale')]
                ].map(([label, val]) => `
                  <div class="bar-item">
                    <div class="bar-label"><span>${label}</span><span><strong>${val}/5</strong></span></div>
                    <div class="bar-track"><div class="bar-fill" style="width:${(val/5)*100}%"></div></div>
                  </div>
                `).join('')}
              </div>

              <div class="card">
                <h3>🎯 NPS - Net Promoter Score</h3>
                <div class="nps-box">
                  <div class="nps-score">${nps}</div>
                  <div class="nps-label">Score NPS</div>
                  <div class="nps-detail">
                    <div><div class="n" style="color:#28a745">${promoteurs}</div><div class="l">Promoteurs</div></div>
                    <div><div class="n" style="color:#ffc107">${npsScores.length - promoteurs - detracteurs}</div><div class="l">Neutres</div></div>
                    <div><div class="n" style="color:#dc3545">${detracteurs}</div><div class="l">Détracteurs</div></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <h3>📋 Dernières réponses</h3>
              <table>
                <tr>
                  <th>Date</th>
                  <th>Accueil</th>
                  <th>Attente</th>
                  <th>Conseiller</th>
                  <th>Traitement</th>
                  <th>Digital</th>
                  <th>Global</th>
                  <th>NPS</th>
                  <th>Commentaire</th>
                </tr>
                ${reponses.slice(-10).reverse().map(r => `
                  <tr>
                    <td>${new Date(r.date_reponse).toLocaleDateString('fr-FR')}</td>
                    <td><span class="badge badge-${r.note_accueil}">${r.note_accueil}/5</span></td>
                    <td><span class="badge badge-${r.note_attente}">${r.note_attente}/5</span></td>
                    <td><span class="badge badge-${r.note_conseiller}">${r.note_conseiller}/5</span></td>
                    <td><span class="badge badge-${r.note_traitement}">${r.note_traitement}/5</span></td>
                    <td><span class="badge badge-${r.note_applications}">${r.note_applications}/5</span></td>
                    <td><span class="badge badge-${r.note_globale}">${r.note_globale}/5</span></td>
                    <td>${r.score_nps !== null ? r.score_nps : '-'}</td>
                    <td>${r.commentaire || '-'}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          </div>
        </body>
        </html>
      `);
    });
  });
});

module.exports = router;