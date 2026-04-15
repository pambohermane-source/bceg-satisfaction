const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../bceg.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erreur connexion base de données:', err.message);
  } else {
    console.log('Base de données BCEG connectée ✅');
  }
});

// Création des tables
db.serialize(() => {

  // Table Agences
  db.run(`CREATE TABLE IF NOT EXISTS agences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    localisation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Table Clients
  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT,
    telephone TEXT,
    email TEXT,
    type_client TEXT,
    agence_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agence_id) REFERENCES agences(id)
  )`);

  // Table Operations
  db.run(`CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    type_operation TEXT,
    date_operation DATETIME,
    agence_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (agence_id) REFERENCES agences(id)
  )`);

  // Table Enquetes
  db.run(`CREATE TABLE IF NOT EXISTS enquetes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    canal TEXT,
    statut TEXT DEFAULT 'envoyee',
    FOREIGN KEY (operation_id) REFERENCES operations(id)
  )`);

  // Table Reponses
  db.run(`CREATE TABLE IF NOT EXISTS reponses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enquete_id INTEGER,
    note_accueil INTEGER,
    note_attente INTEGER,
    note_conseiller INTEGER,
    note_traitement INTEGER,
    note_applications INTEGER,
    note_globale INTEGER,
    score_nps INTEGER,
    commentaire TEXT,
    date_reponse DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enquete_id) REFERENCES enquetes(id)
  )`);

  console.log('Tables créées ✅');
});

module.exports = db;