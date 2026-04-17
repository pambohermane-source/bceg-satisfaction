const express = require('express');
const router = express.Router();
const db = require('../models/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration upload fichiers
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Format non accepte'));
  }
});

// Questionnaires par type d'operation
const questionnaires = {
  'credit': {
    titre: 'Votre demande de credit',
    icon: '💼',
    questions: [
      { id: 'note_accueil', label: 'Comment evaluez-vous la qualite de l\'accueil de votre conseiller ?' },
      { id: 'note_attente', label: 'Etes-vous satisfait(e) du delai de traitement de votre dossier ?' },
      { id: 'note_conseiller', label: 'La clarte des informations fournies etait-elle satisfaisante ?' },
      { id: 'note_traitement', label: 'Le resultat obtenu correspond-il a vos attentes ?' },
      { id: 'note_globale', label: 'Quelle note globale donnez-vous a cette experience ?' }
    ]
  },
  'ouverture': {
    titre: 'Votre ouverture de compte',
    icon: '🏦',
    questions: [
      { id: 'note_accueil', label: 'Comment evaluez-vous la qualite de l\'accueil ?' },
      { id: 'note_attente', label: 'Le delai de traitement de votre dossier etait-il satisfaisant ?' },
      { id: 'note_conseiller', label: 'Les explications sur les produits et services etaient-elles claires ?' },
      { id: 'note_traitement', label: 'La procedure d\'ouverture etait-elle simple et rapide ?' },
      { id: 'note_globale', label: 'Quelle note globale donnez-vous a cette experience ?' }
    ]
  },
  'gestionnaire': {
    titre: 'Votre echange avec votre gestionnaire',
    icon: '🤝',
    questions: [
      { id: 'note_accueil', label: 'Votre gestionnaire etait-il disponible et a l\'ecoute ?' },
      { id: 'note_conseiller', label: 'Les conseils prodigues etaient-ils pertinents et adaptes ?' },
      { id: 'note_traitement', label: 'Votre demande a-t-elle ete traitee de maniere satisfaisante ?' },
      { id: 'note_globale', label: 'Quelle note globale donnez-vous a cet echange ?' }
    ]
  },
  'digital': {
    titre: 'Vos services digitaux BCEG (B-Online)',
    icon: '📱',
    questions: [
      { id: 'note_accueil', label: 'La plateforme est-elle facile a utiliser ?' },
      { id: 'note_attente', label: 'La plateforme est-elle disponible et rapide ?' },
      { id: 'note_conseiller', label: 'En cas de probleme, le support etait-il efficace ?' },
      { id: 'note_applications', label: 'Les fonctionnalites repondent-elles a vos besoins ?' },
      { id: 'note_globale', label: 'Quelle note globale donnez-vous aux services digitaux BCEG ?' }
    ]
  },
  'default': {
    titre: 'Votre visite en agence',
    icon: '⭐',
    questions: [
      { id: 'note_accueil', label: 'Comment evaluez-vous l\'accueil a votre arrivee en agence ?' },
      { id: 'note_attente', label: 'Etes-vous satisfait(e) du temps d\'attente ?' },
      { id: 'note_conseiller', label: 'Comment evaluez-vous la qualite de votre conseiller ?' },
      { id: 'note_traitement', label: 'Votre operation a-t-elle ete traitee rapidement et correctement ?' },
      { id: 'note_applications', label: 'Etes-vous satisfait(e) des services numeriques de la BCEG ?' },
      { id: 'note_globale', label: 'Quelle note globale donnez-vous a votre experience aujourd\'hui ?' }
    ]
  }
};

function detecterType(typeOperation) {
  if (!typeOperation) return 'default';
  const t = typeOperation.toLowerCase();
  if (t.includes('credit') || t.includes('pret') || t.includes('financement')) return 'credit';
  if (t.includes('ouverture') || t.includes('compte')) return 'ouverture';
  if (t.includes('gestionnaire') || t.includes('conseiller') || t.includes('rendez')) return 'gestionnaire';
  if (t.includes('digital') || t.includes('online') || t.includes('b-online') || t.includes('mobile')) return 'digital';
  return 'default';
}

function genererBoutons(questionId, index) {
  const options = [
    { val: 1, emoji: '😞', label: 'Tres mal' },
    { val: 2, emoji: '😕', label: 'Mal' },
    { val: 3, emoji: '😐', label: 'Moyen' },
    { val: 4, emoji: '🙂', label: 'Bien' },
    { val: 5, emoji: '😄', label: 'Tres bien' }
  ];
  const key = questionId + '_' + index;
  return options.map(o =>
    `<button type="button" class="star-btn" data-key="${key}" data-val="${o.val}" onclick="selectNote('${key}','${questionId}',${o.val})">
      <span class="emoji">${o.emoji}</span>${o.label}
    </button>`
  ).join('');
}

// PAGE RECLAMATION
router.get('/reclamation', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reclamation - BCEG</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f3f6f3; color: #2c2c2c; }
    header { background: #4d553d; color: white; padding: 16px 20px; }
    header h1 { font-size: 22px; font-weight: bold; }
    header p { font-size: 12px; color: #c8d4c8; margin-top: 2px; }
    .container { max-width: 620px; margin: 0 auto; padding: 20px 16px 40px; }
    .intro-card { background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; border-left: 5px solid #c0622a; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .intro-card h2 { color: #c0622a; font-size: 17px; margin-bottom: 8px; }
    .intro-card p { color: #555; font-size: 14px; line-height: 1.5; }
    .card { background: white; border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    label { display: block; font-weight: bold; font-size: 14px; color: #333; margin-bottom: 8px; }
    input[type="text"], input[type="email"], input[type="tel"], select, textarea {
      width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px;
      font-size: 14px; font-family: Arial, sans-serif; transition: border 0.2s;
    }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #4d553d; }
    textarea { resize: vertical; min-height: 100px; }
    .upload-zone { border: 2px dashed #a6aa9e; border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.2s; background: #f9f9f7; }
    .upload-zone:hover { border-color: #4d553d; background: #f3f6f3; }
    .upload-zone .icon { font-size: 36px; }
    .upload-zone p { color: #666; font-size: 14px; margin-top: 8px; }
    input[type="file"] { display: none; }
    .file-preview { margin-top: 10px; font-size: 13px; color: #4d553d; font-weight: bold; }
    .submit-btn { width: 100%; padding: 16px; background: #c0622a; color: white; border: none; border-radius: 10px; font-size: 17px; font-weight: bold; cursor: pointer; margin-top: 8px; transition: background 0.2s; }
    .submit-btn:hover { background: #a0511f; }
    .retour-link { display: block; text-align: center; margin-top: 16px; color: #a6aa9e; font-size: 13px; text-decoration: none; }
    .retour-link:hover { color: #4d553d; }
    .success-screen { display: none; text-align: center; background: white; border-radius: 10px; padding: 40px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .check { font-size: 60px; margin-bottom: 16px; }
    .numero { font-size: 26px; font-weight: bold; color: #4d553d; background: #e8ede8; padding: 12px 24px; border-radius: 10px; display: inline-block; margin: 16px 0; letter-spacing: 2px; }
  </style>
</head>
<body>
<header>
  <h1>BCEG</h1>
  <p>Banque pour le Commerce et l'Entrepreneuriat du Gabon</p>
</header>
<div class="container">
  <div class="intro-card">
    <h2>📋 Deposer une reclamation</h2>
    <p>Vous avez rencontre un probleme ? Decrivez-le ci-dessous. Notre equipe vous repondra dans les plus brefs delais. Vous pouvez egalement joindre un document justificatif.</p>
  </div>
  <form id="reclamationForm" enctype="multipart/form-data">
    <div class="card">
      <label>Votre nom complet *</label>
      <input type="text" name="nom" placeholder="Ex : ONDO Jean-Baptiste" required>
    </div>
    <div class="card">
      <label>Votre numero de telephone *</label>
      <input type="tel" name="telephone" placeholder="Ex : 06 12 34 56" required>
    </div>
    <div class="card">
      <label>Votre adresse email (optionnel)</label>
      <input type="email" name="email" placeholder="Ex : votre@email.com">
    </div>
    <div class="card">
      <label>Agence concernee *</label>
      <select name="agence" required>
        <option value="">-- Selectionnez votre agence --</option>
        <option>Agence Okoume (Siege)</option>
        <option>Agence Movingui</option>
        <option>Agence Bilinga</option>
        <option>Point Cash Tali</option>
        <option>Point Cash Akanda</option>
        <option>Bureau Ozigo (Port-Gentil)</option>
        <option>Agence Azobe</option>
        <option>Autre</option>
      </select>
    </div>
    <div class="card">
      <label>Categorie de la reclamation *</label>
      <select name="categorie" required>
        <option value="">-- Selectionnez une categorie --</option>
        <option>Delai de traitement trop long</option>
        <option>Erreur sur mon compte</option>
        <option>Probleme avec un virement</option>
        <option>Probleme avec ma carte bancaire</option>
        <option>Probleme avec B-Online</option>
        <option>Comportement du personnel</option>
        <option>Probleme avec un credit</option>
        <option>Frais non justifies</option>
        <option>Autre</option>
      </select>
    </div>
    <div class="card">
      <label>Description detaillee *</label>
      <textarea name="description" placeholder="Decrivez votre probleme avec le maximum de details : date, agence, type d'operation, ce qui s'est passe..." required></textarea>
    </div>
    <div class="card">
      <label>Joindre un document (optionnel)</label>
      <div class="upload-zone" onclick="document.getElementById('fichier').click()">
        <div class="icon">📎</div>
        <p>Cliquez pour ajouter un document</p>
        <p style="font-size:12px;color:#aaa;margin-top:4px;">PDF, JPG, PNG - max 5 Mo</p>
      </div>
      <input type="file" id="fichier" name="fichier" accept=".pdf,.jpg,.jpeg,.png" onchange="afficherFichier(this)">
      <div class="file-preview" id="filePreview"></div>
    </div>
    <button type="submit" class="submit-btn">Envoyer ma reclamation</button>
    <a href="javascript:history.back()" class="retour-link">← Retour au questionnaire</a>
  </form>
  <div class="success-screen" id="successScreen">
    <div class="check">✅</div>
    <h2>Reclamation enregistree !</h2>
    <p>Votre reclamation a bien ete recue. Voici votre numero de suivi :</p>
    <div class="numero" id="numeroSuivi"></div>
    <p>Conservez ce numero. Notre equipe vous contactera dans les <strong>48 heures</strong> ouvrables.</p>
    <br><p style="color:#4d553d;font-weight:bold;">Merci de votre confiance.</p>
  </div>
</div>
<script>
  function afficherFichier(input) {
    var preview = document.getElementById('filePreview');
    if (input.files && input.files[0]) preview.textContent = 'Fichier selectionne : ' + input.files[0].name;
  }
  document.getElementById('reclamationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var form = e.target;
    var formData = new FormData(form);
    fetch('/enquete/reclamation/soumettre', { method: 'POST', body: formData })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      document.getElementById('numeroSuivi').textContent = data.numero || 'REC-000000';
      form.style.display = 'none';
      document.querySelector('.intro-card').style.display = 'none';
      document.getElementById('successScreen').style.display = 'block';
      window.scrollTo(0, 0);
    }).catch(function() {
      var numero = 'REC-' + Date.now().toString().slice(-6);
      document.getElementById('numeroSuivi').textContent = numero;
      form.style.display = 'none';
      document.querySelector('.intro-card').style.display = 'none';
      document.getElementById('successScreen').style.display = 'block';
    });
  });
</script>
</body>
</html>`);
});

// SOUMISSION RECLAMATION
router.post('/reclamation/soumettre', upload.single('fichier'), (req, res) => {
  const { nom, telephone, email, agence, categorie, description } = req.body;
  const numero = 'REC-' + Date.now().toString().slice(-6);
  const fichierNom = req.file ? req.file.originalname : null;
  const fichierPath = req.file ? req.file.filename : null;

  db.run(`INSERT INTO reclamations (numero_suivi, nom_client, telephone, email, agence, categorie, description, fichier_nom, fichier_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [numero, nom, telephone, email || '', agence, categorie, description, fichierNom, fichierPath],
    function(err) {
      if (err) {
        console.error('Erreur reclamation:', err);
        return res.status(500).json({ error: 'Erreur enregistrement', numero: 'REC-' + Date.now().toString().slice(-6) });
      }
      res.json({ success: true, numero, id: this.lastID });
    }
  );
});

// PAGE QUESTIONNAIRE CLIENT
router.get('/:clientId', (req, res) => {
  const clientId = req.params.clientId;

  db.get(`SELECT c.*, o.id as operation_id, o.type_operation, a.nom as agence_nom
          FROM clients c
          LEFT JOIN operations o ON o.client_id = c.id
          LEFT JOIN agences a ON a.id = c.agence_id
          WHERE c.id = ?`, [clientId], (err, client) => {

    if (!client) {
      client = {
        id: clientId,
        nom: 'Client',
        prenom: 'Demo BCEG',
        operation_id: null,
        type_operation: 'Visite en agence',
        agence_nom: 'BCEG'
      };
    }

    const typeQuestionnaire = detecterType(client.type_operation);
    const questionnaire = questionnaires[typeQuestionnaire];

    const questionsHTML = questionnaire.questions.map((q, i) => `
      <div class="question-card">
        <div class="question-label">
          <span class="question-num">${i + 1}</span>${q.label}
        </div>
        <div class="stars">
          ${genererBoutons(q.id, i)}
        </div>
        <input type="hidden" name="${q.id}" id="hidden_${q.id}">
      </div>
    `).join('');

    const numNPS = questionnaire.questions.length + 1;
    const numCommentaire = numNPS + 1;

    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enquete Satisfaction - BCEG</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f3f6f3; color: #2c2c2c; }
    header { background: #4d553d; color: white; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; }
    header h1 { font-size: 22px; font-weight: bold; }
    header p { font-size: 12px; color: #c8d4c8; margin-top: 2px; }
    .badge-agence { background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 12px; font-size: 12px; color: #e8ede8; }
    .container { max-width: 620px; margin: 0 auto; padding: 20px 16px 40px; }
    .intro-card { background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; border-left: 5px solid #4d553d; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .intro-card h2 { color: #4d553d; font-size: 17px; margin-bottom: 8px; }
    .intro-card p { color: #555; font-size: 14px; line-height: 1.5; }
    .badge-type { display: inline-block; background: #4d553d; color: white; border-radius: 20px; padding: 4px 14px; font-size: 13px; margin-top: 10px; }
    .question-card { background: white; border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .question-label { font-size: 15px; font-weight: bold; color: #333; margin-bottom: 14px; line-height: 1.4; }
    .question-num { display: inline-block; background: #4d553d; color: white; border-radius: 50%; width: 26px; height: 26px; text-align: center; line-height: 26px; font-size: 13px; margin-right: 8px; }
    .stars { display: flex; gap: 8px; flex-wrap: wrap; }
    .star-btn { flex: 1; min-width: 52px; padding: 12px 6px; border: 2px solid #ddd; border-radius: 8px; background: white; cursor: pointer; text-align: center; font-size: 12px; transition: all 0.2s; }
    .star-btn:hover { border-color: #4d553d; background: #f3f6f3; }
    .star-btn.selected { border-color: #4d553d; background: #4d553d; color: white; }
    .emoji { font-size: 20px; display: block; margin-bottom: 4px; }
    .nps-grid { display: flex; gap: 6px; flex-wrap: wrap; }
    .nps-btn { width: 44px; height: 44px; border: 2px solid #ddd; border-radius: 8px; background: white; cursor: pointer; font-size: 15px; font-weight: bold; transition: all 0.2s; }
    .nps-btn:hover { border-color: #4d553d; }
    .nps-btn.selected { background: #4d553d; border-color: #4d553d; color: white; }
    .nps-labels { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #888; }
    textarea { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; font-family: Arial, sans-serif; resize: vertical; min-height: 90px; }
    textarea:focus { outline: none; border-color: #4d553d; }
    .submit-btn { width: 100%; padding: 16px; background: #4d553d; color: white; border: none; border-radius: 10px; font-size: 17px; font-weight: bold; cursor: pointer; margin-top: 8px; }
    .submit-btn:hover { background: #3a4130; }

    /* BOUTON RECLAMATION ANIME */
    .reclamation-banner {
      display: block;
      margin-top: 24px;
      padding: 16px 20px;
      background: linear-gradient(135deg, #c0622a, #e07b39);
      color: white;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      font-size: 15px;
      font-weight: bold;
      box-shadow: 0 4px 15px rgba(192,98,42,0.4);
      animation: pulse 2s infinite;
      transition: transform 0.2s;
    }
    .reclamation-banner:hover { transform: scale(1.02); }
    .reclamation-banner .rec-icon { font-size: 24px; display: block; margin-bottom: 4px; }
    .reclamation-banner .rec-sub { font-size: 12px; opacity: 0.9; font-weight: normal; margin-top: 4px; display: block; }
    @keyframes pulse {
      0% { box-shadow: 0 4px 15px rgba(192,98,42,0.4); }
      50% { box-shadow: 0 4px 25px rgba(192,98,42,0.8); }
      100% { box-shadow: 0 4px 15px rgba(192,98,42,0.4); }
    }

    .note-small { font-size: 12px; color: #999; text-align: center; margin-top: 16px; }
    .success-screen { display: none; text-align: center; background: white; border-radius: 10px; padding: 40px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .success-screen .check { font-size: 60px; margin-bottom: 16px; }
    .success-screen h2 { color: #4d553d; font-size: 22px; margin-bottom: 12px; }
    .success-screen p { color: #555; font-size: 15px; line-height: 1.5; }
  </style>
</head>
<body>
<header>
  <div>
    <h1>BCEG</h1>
    <p>Banque pour le Commerce et l'Entrepreneuriat du Gabon</p>
  </div>
  <div class="badge-agence">${client.agence_nom || 'BCEG'}</div>
</header>

<div class="container">
  <div class="intro-card">
    <h2>Bonjour ${client.prenom} ${client.nom} !</h2>
    <p>Votre avis compte beaucoup pour la BCEG. Cette enquete prend moins de <strong>2 minutes</strong>.</p>
    <span class="badge-type">${questionnaire.icon} ${questionnaire.titre}</span>
  </div>

  <form id="enqueteForm">
    <input type="hidden" name="enquete_id" value="${client.operation_id || 0}">
    ${questionsHTML}

    <div class="question-card">
      <div class="question-label">
        <span class="question-num">${numNPS}</span>Sur une echelle de 0 a 10, recommanderiez-vous la BCEG a un proche ?
      </div>
      <div class="nps-grid" id="nps-grid">
        ${[0,1,2,3,4,5,6,7,8,9,10].map(n => `<button type="button" class="nps-btn" onclick="selectNPS(${n})">${n}</button>`).join('')}
      </div>
      <div class="nps-labels"><span>Pas du tout</span><span>Certainement</span></div>
      <input type="hidden" name="score_nps" id="score_nps">
    </div>

    <div class="question-card">
      <div class="question-label">
        <span class="question-num">${numCommentaire}</span>Avez-vous un commentaire ou une suggestion ? (optionnel)
      </div>
      <textarea name="commentaire" placeholder="Partagez votre experience, vos suggestions..."></textarea>
    </div>

    <button type="submit" class="submit-btn">Envoyer mon avis</button>
    <p class="note-small">Vos reponses sont confidentielles et utilisees uniquement pour ameliorer nos services.</p>
  </form>

  <!-- BOUTON RECLAMATION VISIBLE ET ANIME -->
  <a href="/enquete/reclamation" class="reclamation-banner">
    <span class="rec-icon">⚠️</span>
    Vous avez une reclamation ?
    <span class="rec-sub">Cliquez ici pour la deposer — Notre equipe vous repond sous 48h</span>
  </a>

  <div class="success-screen" id="successScreen">
    <div class="check">✅</div>
    <h2>Merci pour votre avis !</h2>
    <p>Votre retour a bien ete enregistre.<br>La BCEG vous remercie de votre confiance.</p>
    <br><p style="color:#4d553d;font-weight:bold;">Bonne journee !</p>
  </div>
</div>

<script>
  var hiddenValues = {};
  function selectNote(key, fieldId, val) {
    hiddenValues[fieldId] = val;
    document.getElementById('hidden_' + fieldId).value = val;
    document.querySelectorAll('[data-key="' + key + '"]').forEach(function(btn, i) {
      btn.classList.toggle('selected', i < val);
    });
  }
  function selectNPS(val) {
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
      note_accueil: form.note_accueil ? (form.note_accueil.value || 3) : 3,
      note_attente: form.note_attente ? (form.note_attente.value || 3) : 3,
      note_conseiller: form.note_conseiller ? (form.note_conseiller.value || 3) : 3,
      note_traitement: form.note_traitement ? (form.note_traitement.value || 3) : 3,
      note_applications: form.note_applications ? (form.note_applications.value || 3) : 3,
      note_globale: form.note_globale ? (form.note_globale.value || 3) : 3,
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
      document.querySelector('.reclamation-banner').style.display = 'none';
      document.getElementById('successScreen').style.display = 'block';
    }).catch(function() {
      form.style.display = 'none';
      document.querySelector('.intro-card').style.display = 'none';
      document.querySelector('.reclamation-banner').style.display = 'none';
      document.getElementById('successScreen').style.display = 'block';
    });
  });
</script>
</body>
</html>`);
  });
});

// ENREGISTREMENT REPONSE
router.post('/repondre', (req, res) => {
  const { enquete_id, note_accueil, note_attente, note_conseiller, note_traitement, note_applications, note_globale, score_nps, commentaire } = req.body;
  db.run(`INSERT INTO reponses (enquete_id, note_accueil, note_attente, note_conseiller, note_traitement, note_applications, note_globale, score_nps, commentaire, date_reponse)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [enquete_id || 0, note_accueil || 3, note_attente || 3, note_conseiller || 3, note_traitement || 3, note_applications || 3, note_globale || 3, score_nps || 7, commentaire || ''],
    function(err) {
      if (err) return res.status(500).json({ error: 'Erreur enregistrement' });
      res.json({ success: true, id: this.lastID });
    }
  );
});


// SERVIR LES FICHIERS DE RECLAMATION
router.get('/fichier/:filename', function(req, res) {
  var filePath = path.join(__dirname, '..', 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Fichier non trouve');
  }
});

module.exports = router;
