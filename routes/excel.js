const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../models/database');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, 'import-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// PAGE D'IMPORT
router.get('/importer', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Import Excel - BCEG</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Segoe UI,Arial,sans-serif;background:#f3f6f3;color:#2c2c2c;}
header{background:linear-gradient(135deg,#4d553d,#3a4130);color:white;padding:20px 28px;}
header h1{font-size:22px;font-weight:800;}header p{font-size:12px;color:#c8d4c8;margin-top:2px;}
.container{max-width:700px;margin:0 auto;padding:28px 20px;}
.card{background:white;border-radius:16px;padding:28px;box-shadow:0 4px 20px rgba(0,0,0,0.08);margin-bottom:20px;}
.card h2{font-size:18px;font-weight:800;color:#4d553d;margin-bottom:16px;}
.upload-zone{border:2px dashed #a6aa9e;border-radius:12px;padding:40px;text-align:center;cursor:pointer;transition:all 0.2s;background:#fafafa;}
.upload-zone:hover{border-color:#4d553d;background:#f3f6f3;}
.upload-zone .icon{font-size:48px;margin-bottom:12px;}
.upload-zone p{color:#666;font-size:15px;margin-bottom:6px;}
.upload-zone .hint{font-size:12px;color:#aaa;}
input[type=file]{display:none;}
.file-preview{margin-top:16px;background:#e8ede8;padding:12px 16px;border-radius:10px;font-size:14px;color:#4d553d;font-weight:600;display:none;}
.btn{width:100%;padding:16px;background:linear-gradient(135deg,#4d553d,#3a4130);color:white;border:none;border-radius:12px;font-size:17px;font-weight:800;cursor:pointer;margin-top:16px;transition:all 0.2s;}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(77,85,61,0.3);}
.btn:disabled{background:#aaa;transform:none;cursor:not-allowed;}
.result{margin-top:20px;padding:16px;border-radius:12px;font-size:14px;display:none;}
.result.success{background:#e8f5e9;color:#2e7d32;border-left:4px solid #27ae60;}
.result.error{background:#fde8e8;color:#c0392b;border-left:4px solid #e74c3c;}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;}
th{background:#4d553d;color:white;padding:10px;text-align:left;}
td{padding:9px 10px;border-bottom:1px solid #eee;}
.colonnes-info{background:#e8f4fd;border-left:4px solid #2d6a9f;border-radius:8px;padding:14px;font-size:13px;color:#2d6a9f;}
.col-tag{display:inline-block;background:#4d553d;color:white;padding:3px 8px;border-radius:6px;font-size:11px;margin:2px;font-family:monospace;}
.col-tag.opt{background:#a6aa9e;}
</style>
</head>
<body>
<header>
  <h1>BCEG — Import Clients</h1>
  <p>Interface d'importation du fichier Excel quotidien</p>
</header>
<div class="container">
  <div class="card">
    <h2>📂 Importer le fichier Excel du jour</h2>
    <div class="upload-zone" onclick="document.getElementById('fichier').click()">
      <div class="icon">📊</div>
      <p>Cliquez pour selectionner le fichier Excel</p>
      <p class="hint">Format .xlsx uniquement — Maximum 10 Mo</p>
    </div>
    <input type="file" id="fichier" accept=".xlsx" onchange="afficherFichier(this)">
    <div class="file-preview" id="filePreview"></div>
    <button class="btn" id="btnImport" onclick="importer()" disabled>Importer les donnees</button>
    <div class="result" id="result"></div>
  </div>

  <div class="card">
    <h2>📋 Format du fichier attendu</h2>
    <div class="colonnes-info">
      <p style="margin-bottom:10px;"><b>Colonnes obligatoires :</b></p>
      <span class="col-tag">NOM_CLIENT</span>
      <span class="col-tag">NUM_CLIENT</span>
      <span class="col-tag">AGENCE_CLIENT</span>
      <span class="col-tag">CODE_GESTIONNAIRE</span>
      <span class="col-tag">NOM_GESTIONNAIRE</span>
      <span class="col-tag">LIBELLE_PRODUIT</span>
      <span class="col-tag">DATE_SOUSCRIPTION</span>
      <br><br>
      <p style="margin-bottom:10px;"><b>Colonnes optionnelles :</b></p>
      <span class="col-tag opt">Telephone</span>
      <span class="col-tag opt">Email</span>
      <span class="col-tag opt">Type Client</span>
      <span class="col-tag opt">ClientType Operation</span>
      <br><br>
      <p style="color:#555;margin-top:8px;">Le systeme accepte aussi le format standard avec les colonnes NOM, Prenom, Telephone, Email, Type Client, ClientType Operation, Date.</p>
    </div>
  </div>
</div>

<script>
var fichierSelectionne = null;
function afficherFichier(input) {
  if (input.files && input.files[0]) {
    fichierSelectionne = input.files[0];
    var preview = document.getElementById('filePreview');
    preview.textContent = '✓ Fichier selectionne : ' + fichierSelectionne.name + ' (' + Math.round(fichierSelectionne.size/1024) + ' Ko)';
    preview.style.display = 'block';
    document.getElementById('btnImport').disabled = false;
  }
}
function importer() {
  if (!fichierSelectionne) return;
  var btn = document.getElementById('btnImport');
  btn.textContent = 'Importation en cours...';
  btn.disabled = true;
  var formData = new FormData();
  formData.append('fichier', fichierSelectionne);
  fetch('/excel/traiter', { method: 'POST', body: formData })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var result = document.getElementById('result');
    if (data.success) {
      result.className = 'result success';
      result.innerHTML = '<b>✅ Importation reussie !</b><br>' + data.message;
    } else {
      result.className = 'result error';
      result.innerHTML = '<b>❌ Erreur</b><br>' + (data.error || 'Une erreur est survenue');
    }
    result.style.display = 'block';
    btn.textContent = 'Importer les donnees';
    btn.disabled = false;
  }).catch(function(err) {
    var result = document.getElementById('result');
    result.className = 'result error';
    result.innerHTML = '<b>❌ Erreur</b><br>' + err.message;
    result.style.display = 'block';
    btn.textContent = 'Importer les donnees';
    btn.disabled = false;
  });
}
</script>
</body></html>`);
});

// TRAITEMENT DU FICHIER EXCEL
router.post('/traiter', upload.single('fichier'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier recu' });

  try {
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (data.length === 0) return res.status(400).json({ error: 'Fichier vide ou format invalide' });

    let importe = 0;
    let erreurs = 0;
    let traite = 0;

    function traiterLigne(index) {
      if (index >= data.length) {
        fs.unlink(req.file.path, function() {});
        return res.json({
          success: true,
          message: importe + ' client(s) importes avec succes. ' + (erreurs > 0 ? erreurs + ' erreur(s).' : '')
        });
      }

      const row = data[index];

      // Support deux formats : format BCEG natif et format standard
      const nom = (row['NOM_CLIENT'] || row['NOM'] || '').toString().trim();
      const prenom = (row['Prenom'] || '').toString().trim();
      const telephone = (row['Telephone'] || row['NUM_CLIENT'] || '').toString().trim().replace(/\s/g, '');
      const email = (row['Email'] || '').toString().trim();
      const typeClient = (row['Type Client'] || row['LIBELLE_PRODUIT'] || '').toString().trim();
      const typeOperation = (row['ClientType Operation'] || row['LIBELLE_PRODUIT'] || '').toString().trim();
      const dateOp = (row['Date'] || row['DATE_SOUSCRIPTION'] || '').toString().trim();
      const agenceCode = (row['AGENCE_CLIENT'] || '').toString().trim();
      const codeGest = (row['CODE_GESTIONNAIRE'] || '').toString().trim();
      const nomGest = (row['NOM_GESTIONNAIRE'] || '').toString().trim();

      if (!nom) { traiterLigne(index + 1); return; }

      // Trouver ou creer l'agence
      db.get('SELECT id FROM agences WHERE nom = ?', [agenceCode], function(err, agence) {
        function continuerAvecAgence(agenceId) {
          // Inserer le client
          db.run('INSERT INTO clients (nom, prenom, telephone, email, type_client, agence_id) VALUES (?,?,?,?,?,?)',
            [nom, prenom, telephone, email, typeClient, agenceId],
            function(err) {
              if (err) { erreurs++; traiterLigne(index + 1); return; }
              const clientId = this.lastID;

              // Inserer l'operation
              db.run('INSERT INTO operations (client_id, type_operation, date_operation, agence_id, code_gestionnaire, nom_gestionnaire) VALUES (?,?,?,?,?,?)',
                [clientId, typeOperation, dateOp, agenceId, codeGest, nomGest],
                function(err) {
                  if (err) { erreurs++; traiterLigne(index + 1); return; }
                  const opId = this.lastID;

                  // Creer l'enquete
                  db.run('INSERT INTO enquetes (operation_id, statut) VALUES (?, ?)',
                    [opId, 'en_attente'],
                    function(err) {
                      if (!err) importe++;
                      traiterLigne(index + 1);
                    }
                  );
                }
              );
            }
          );
        }

        if (agence) {
          continuerAvecAgence(agence.id);
        } else if (agenceCode) {
          db.run('INSERT INTO agences (nom) VALUES (?)', [agenceCode], function(err) {
            continuerAvecAgence(err ? null : this.lastID);
          });
        } else {
          continuerAvecAgence(null);
        }
      });
    }

    traiterLigne(0);

  } catch (e) {
    res.status(500).json({ error: 'Erreur lecture fichier: ' + e.message });
  }
});

module.exports = router;
