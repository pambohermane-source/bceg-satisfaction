const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/:clientId', (req, res) => {
  const clientId = req.params.clientId;

  db.get(`SELECT c.*, o.id as operation_id, o.type_operation 
          FROM clients c 
          LEFT JOIN operations o ON o.client_id = c.id 
          WHERE c.id = ?`, [clientId], (err, client) => {

    if (err) {
      return res.status(500).send('Erreur serveur');
    }

    // Si pas de client trouve, on affiche quand meme le formulaire en mode demo
    if (!client) {
      client = {
        id: clientId,
        nom: 'Client',
        prenom: 'Demo BCEG',
        operation_id: null,
        type_operation: 'Visite en agence'
      };
    }

    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enquete Satisfaction - BCEG</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f3f6f3; color: #2c2c2c; }
    
    header {
      background: #4d553d;
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    header h1 { font-size: 22px; font-weight: bold; }
    header p { font-size: 12px; color: #c8d4c8; margin-top: 2px; }
    
    .container { max-width: 620px; margin: 0 auto; padding: 20px 16px 40px; }
    
    .intro-card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      border-left: 5px solid #4d553d;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .intro-card h2 { color: #4d553d; font-size: 17px; margin-bottom: 8px; }
    .intro-card p { color: #555; font-size: 14px; line-height: 1.5; }
    
    .question-card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .question-label {
      font-size: 15px;
      font-weight: bold;
      color: #333;
      margin-bottom: 14px;
      line-height: 1.4;
    }
    .question-num {
      display: inline-block;
      background: #4d553d;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      text-align: center;
      line-height: 24px;
      font-size: 13px;
      margin-right: 8px;
    }
    
    .stars { display: flex; gap: 8px; flex-wrap: wrap; }
    .star-btn {
      flex: 1;
      min-width: 50px;
      padding: 12px 8px;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      text-align: center;
      font-size: 13px;
      transition: all 0.2s;
    }
    .star-btn:hover { border-color: #4d553d; background: #f3f6f3; }
    .star-btn.selected { border-color: #4d553d; background: #4d553d; color: white; }
    .star-btn .emoji { font-size: 20px; display: block; margin-bottom: 4px; }
    
    .nps-grid { display: flex; gap: 6px; flex-wrap: wrap; }
    .nps-btn {
      width: 44px;
      height: 44px;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      font-size: 15px;
      font-weight: bold;
      transition: all 0.2s;
    }
    .nps-btn:hover { border-color: #4d553d; }
    .nps-btn.selected { background: #4d553d; border-color: #4d553d; color: white; }
    .nps-labels { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #888; }
    
    textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      font-family: Arial, sans-serif;
      resize: vertical;
      min-height: 90px;
      transition: border 0.2s;
    }
    textarea:focus { outline: none; border-color: #4d553d; }
    
    .submit-btn {
      width: 100%;
      padding: 16px;
      background: #4d553d;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 17px;
      font-weight: bold;
      cursor: pointer;
      margin-top: 8px;
      transition: background 0.2s;
    }
    .submit-btn:hover { background: #3a4130; }
    
    .success-screen {
      display: none;
      text-align: center;
      background: white;
      border-radius: 10px;
      padding: 40px 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .success-screen .check { font-size: 60px; margin-bottom: 16px; }
    .success-screen h2 { color: #4d553d; font-size: 22px; margin-bottom: 12px; }
    .success-screen p { color: #555; font-size: 15px; line-height: 1.5; }
    
    .note-small { font-size: 12px; color: #999; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>

<header>
  <div>
    <h1>BCEG</h1>
    <p>Banque pour le Commerce et l'Entrepreneuriat du Gabon</p>
  </div>
  <div style="font-size:12px; color:#c8d4c8; text-align:right;">
    Enquete<br>Satisfaction
  </div>
</header>

<div class="container">
  
  <div class="intro-card">
    <h2>Bonjour ${client.prenom} ${client.nom} !</h2>
    <p>Votre avis compte beaucoup pour la BCEG. Cette enquete prend moins de <strong>2 minutes</strong> et nous aide a ameliorer nos services pour vous.</p>
  </div>

  <form id="enqueteForm">
    <input type="hidden" name="enquete_id" value="${client.operation_id || 0}">

    <div class="question-card">
      <div class="question-label"><span class="question-num">1</span>Comment evaluez-vous l'accueil a votre arrivee en agence ?</div>
      <div class="stars" id="stars-accueil">
        <button type="button" class="star-btn" onclick="selectNote('accueil', 1)"><span class="emoji">😞</span>Tres mal</button>
        <button type="button" class="star-btn" onclick="selectNote('accueil', 2)"><span class="emoji">😕</span>Mal</button>
        <button type="button" class="star-btn" onclick="selectNote('accueil', 3)"><span class="emoji">😐</span>Moyen</button>
        <button type="button" class="star-btn" onclick="selectNote('accueil', 4)"><span class="emoji">🙂</span>Bien</button>
        <button type="button" class="star-btn" onclick="selectNote('accueil', 5)"><span class="emoji">😄</span>Tres bien</button>
      </div>
      <input type="hidden" name="note_accueil" id="note_accueil">
    </div>

    <div class="question-card">
      <div class="question-label"><span class="question-num">2</span>Etes-vous satisfait(e) du temps d'attente ?</div>
      <div class="stars" id="stars-attente">
        <button type="button" class="star-btn" onclick="selectNote('attente', 1)"><span class="emoji">😞</span>Tres long</button>
        <button type="button" class="star-btn" onclick="selectNote('attente', 2)"><span class="emoji">😕</span>Long</button>
        <button type="button" class="star-btn" onclick="selectNote('attente', 3)"><span class="emoji">😐</span>Moyen</button>
        <button type="button" class="star-btn" onclick="selectNote('attente', 4)"><span class="emoji">🙂</span>Court</button>
        <button type="button" class="star-btn" onclick="selectNote('attente', 5)"><span class="emoji">😄</span>Tres court</button>
      </div>
      <input type="hidden" name="note_attente" id="note_attente">
    </div>

    <div class="question-card">
      <div class="question-label"><span class="question-num">3</span>Comment evaluez-vous la qualite de votre conseiller ?</div>
      <div class="stars" id="stars-conseiller">
        <button type="button" class="star-btn" onclick="selectNote('conseiller', 1)"><span class="emoji">😞</span>Tres mal</button>
        <button type="button" class="star-btn" onclick="selectNote('conseiller', 2)"><span class="emoji">😕</span>Mal</button>
        <button type="button" class="star-btn" onclick="selectNote('conseiller', 3)"><span class="emoji">😐</span>Moyen</button>
        <button type="button" class="star-btn" onclick="selectNote('conseiller', 4)"><span class="emoji">🙂</span>Bien</button>
        <button type="button" class="star-btn" onclick="selectNote('conseiller', 5)"><span class="emoji">😄</span>Tres bien</button>
      </div>
      <input type="hidden" name="note_conseiller" id="note_conseiller">
    </div>

    <div class="question-card">
      <div class="question-label"><span class="question-num">4</span>Votre operation a-t-elle ete traitee rapidement et correctement ?</div>
      <div class="stars" id="stars-traitement">
        <button type="button" class="star-btn" onclick="selectNote('traitement', 1)"><span class="emoji">😞</span>Tres mal</button>
        <button type="button" class="star-btn" onclick="selectNote('traitement', 2)"><span class="emoji">😕</span>Mal</button>
        <button type="button" class="star-btn" onclick="selectNote('traitement', 3)"><span class="emoji">😐</span>Moyen</button>
        <button type="button" class="star-btn" onclick="selectNote('traitement', 4)"><span class="emoji">🙂</span>Bien</button>
        <button type="button" class="star-btn" onclick="selectNote('traitement', 5)"><span class="emoji">😄</span>Tres bien</button>
      </div>
      <input type="hidden" name="note_traitement" id="note_traitement">
    </div>

    <div class="question-card">
      <div class="question-label"><span class="question-num">5</span>Etes-vous satisfait(e) des services numeriques de la BCEG (B-Online...) ?</div>
      <div class="stars" id="stars-applications">
        <button type="button" class="star-btn" onclick="selectNote('applications', 1)"><span class="emoji">😞</span>Tres mal</button>
        <button type="button" class="star-btn" onclick="selectNote('applications', 2)"><span class="emoji">😕</span>Mal</button>
        <button type="button" class="star-btn" onclick="selectNote('applications', 3)"><span class="emoji">😐</span>Moyen</button>
        <button type="button" class="star-btn" onclick="selectNote('applications', 4)"><span class="emoji">🙂</span>Bien</button>
        <button type="button" class="star-btn" onclick="selectNote('applications', 5)"><span class="emoji">😄</span>Tres bien</button>
      </div>
      <input type="hidden" name="note_applications" id="note_applications">
    </div>

    <div class="question-card">
      <div class="question-label"><span class="question-num">6</span>Quelle note globale donnez-vous a votre experience aujourd'hui ?</div>
      <div class="stars" id="stars-global">
        <button type="button" class="star-btn" onclick="selectNote('global', 1)"><span class="emoji">😞</span>Tres mal</button>
        <button type="button" class="star-btn" onclick="selectNote('global', 2)"><span class="emoji">😕</span>Mal</button>
        <button type="button" class="star-btn" onclick="selectNote('global', 3)"><span class="emoji">😐</span>Moyen</button>
        <button type="button" class="star-btn" onclick="selectNote('global', 4)"><span class="emoji">🙂</span>Bien</button>
        <button type="button" class="star-btn" onclick="selectNote('global', 5)"><span class="emoji">😄</span>Tres bien</button>
      </div>
      <input type="hidden" name="note_globale" id="note_globale">
    </div>

    <div class="question-card">
      <div class="question-label"><span class="question-num">7</span>Sur une echelle de 0 a 10, recommanderiez-vous la BCEG a un proche ?</div>
      <div class="nps-grid" id="nps-grid">
        ${[0,1,2,3,4,5,6,7,8,9,10].map(n => `<button type="button" class="nps-btn" onclick="selectNPS(${n})">${n}</button>`).join('')}
      </div>
      <div class="nps-labels"><span>Pas du tout</span><span>Certainement</span></div>
      <input type="hidden" name="score_nps" id="score_nps">
    </div>

    <div class="question-card">
      <div class="question-label"><span class="question-num">8</span>Avez-vous un commentaire ou une suggestion ? (optionnel)</div>
      <textarea name="commentaire" placeholder="Partagez votre experience, vos suggestions..."></textarea>
    </div>

    <button type="submit" class="submit-btn">Envoyer mon avis</button>
    <p class="note-small">Vos reponses sont confidentielles et utilisees uniquement pour ameliorer nos services.</p>
  </form>

  <div class="success-screen" id="successScreen">
    <div class="check">✅</div>
    <h2>Merci pour votre avis !</h2>
    <p>Votre retour a bien ete enregistre.<br>La BCEG vous remercie de votre confiance et s'engage a ameliorer continuellement la qualite de ses services.</p>
    <br>
    <p style="color:#4d553d; font-weight:bold;">Bonne journee !</p>
  </div>

</div>

<script>
  var notes = {};
  
  function selectNote(critere, val) {
    notes[critere] = val;
    document.getElementById('note_' + critere).value = val;
    var btns = document.getElementById('stars-' + critere).querySelectorAll('.star-btn');
    btns.forEach(function(btn, i) {
      btn.classList.toggle('selected', i < val);
    });
  }
  
  function selectNPS(val) {
    notes['nps'] = val;
    document.getElementById('score_nps').value = val;
    document.getElementById('nps-grid').querySelectorAll('.nps-btn').forEach(function(btn) {
      btn.classList.toggle('selected', parseInt(btn.textContent) === val);
    });
  }

  document.getElementById('enqueteForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var form = e.target;
    var data = {
      enquete_id: form.enquete_id.value,
      note_accueil: form.note_accueil.value || 3,
      note_attente: form.note_attente.value || 3,
      note_conseiller: form.note_conseiller.value || 3,
      note_traitement: form.note_traitement.value || 3,
      note_applications: form.note_applications.value || 3,
      note_globale: form.note_globale.value || 3,
      score_nps: form.score_nps.value || 7,
      commentaire: form.commentaire.value
    };
    fetch('/enquete/repondre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function() {
      form.style.display = 'none';
      document.querySelector('.intro-card').style.display = 'none';
      document.getElementById('successScreen').style.display = 'block';
    }).catch(function() {
      form.style.display = 'none';
      document.querySelector('.intro-card').style.display = 'none';
      document.getElementById('successScreen').style.display = 'block';
    });
  });
</script>

</body>
</html>`);
  });
});

router.post('/repondre', (req, res) => {
  const { enquete_id, note_accueil, note_attente, note_conseiller, note_traitement, note_applications, note_globale, score_nps, commentaire } = req.body;

  db.run(`INSERT INTO reponses 
    (enquete_id, note_accueil, note_attente, note_conseiller, note_traitement, note_applications, note_globale, score_nps, commentaire, date_reponse)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [enquete_id || 0, note_accueil || 3, note_attente || 3, note_conseiller || 3, note_traitement || 3, note_applications || 3, note_globale || 3, score_nps || 7, commentaire || ''],
    function(err) {
      if (err) {
        console.error('Erreur enregistrement reponse:', err);
        return res.status(500).json({ error: 'Erreur enregistrement' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

module.exports = router;
