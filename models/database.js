const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'bceg.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Table agences
  db.run(`CREATE TABLE IF NOT EXISTS agences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    localisation TEXT
  )`);

  // Table clients
  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT,
    telephone TEXT,
    email TEXT,
    type_client TEXT,
    agence_id INTEGER,
    date_creation DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (agence_id) REFERENCES agences(id)
  )`);

  // Table operations
  db.run(`CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    type_operation TEXT,
    date_operation TEXT,
    agence_id INTEGER,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (agence_id) REFERENCES agences(id)
  )`);

  // Table enquetes
  db.run(`CREATE TABLE IF NOT EXISTS enquetes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER,
    date_envoi DATETIME DEFAULT (datetime('now')),
    canal TEXT DEFAULT 'SMS',
    statut TEXT DEFAULT 'envoye',
    FOREIGN KEY (operation_id) REFERENCES operations(id)
  )`);

  // Table reponses
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
    date_reponse DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (enquete_id) REFERENCES enquetes(id)
  )`);

  // Table reclamations
  db.run(`CREATE TABLE IF NOT EXISTS reclamations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_suivi TEXT UNIQUE,
    nom_client TEXT NOT NULL,
    telephone TEXT,
    email TEXT,
    agence TEXT,
    categorie TEXT,
    description TEXT,
    fichier_nom TEXT,
    fichier_path TEXT,
    statut TEXT DEFAULT 'Nouvelle',
    date_reception DATETIME DEFAULT (datetime('now')),
    date_traitement DATETIME
  )`);

  console.log('Base de donnees initialisee avec succes');
});

module.exports = db;
