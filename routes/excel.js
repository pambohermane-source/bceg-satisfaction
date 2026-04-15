const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const path = require('path');
const db = require('../models/database');
const { envoyerSMS } = require('./sms');

router.post('/importer', (req, res) => {
  const filePath = path.join(__dirname, '../uploads/operations.xlsx');

  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    let importes = 0;

    data.forEach((row) => {
      db.run(
        `INSERT INTO clients (nom, prenom, telephone, email, type_client) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          row['NOM'] || '',
          row['Prénom'] || '',
          row['Téléphone'] || '',
          row['Email'] || '',
          row['Type Client'] || 'particulier'
        ],
        function(err) {
          if (!err) {
            const clientId = this.lastID;
            const telephone = row['Téléphone'] || '';
            const prenom = row['Prénom'] || '';
            const typeOperation = row['ClientType Opération'] || '';

            db.run(
              `INSERT INTO operations (client_id, type_operation, date_operation) 
               VALUES (?, ?, ?)`,
              [
                clientId,
                typeOperation,
                row['Date'] || new Date().toISOString()
              ]
            );

            const message = `Bonjour ${prenom}, suite à votre ${typeOperation} à la BCEG, donnez-nous votre avis : http://localhost:3000/enquete/${clientId}`;
            
            envoyerSMS(telephone, message);
            importes++;
          } else {
            console.log('Erreur:', err.message);
          }
        }
      );
    });

    res.json({
      message: `Importation et envoi SMS terminés ✅`,
      total: data.length,
      importes: importes
    });

  } catch (err) {
    res.status(500).json({
      message: 'Erreur lecture fichier Excel',
      erreur: err.message
    });
  }
});

module.exports = router;