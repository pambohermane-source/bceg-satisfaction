const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'bceg.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS agences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    localisation TEXT
  )`);

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

  db.run(`CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    type_operation TEXT,
    date_operation TEXT,
    agence_id INTEGER,
    code_gestionnaire TEXT,
    nom_gestionnaire TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (agence_id) REFERENCES agences(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS enquetes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER,
    date_envoi DATETIME DEFAULT (datetime('now')),
    canal TEXT DEFAULT 'SMS',
    statut TEXT DEFAULT 'envoye',
    FOREIGN KEY (operation_id) REFERENCES operations(id)
  )`);

  // ── TABLE REPONSES ─────────────────────────────────────────────
  // Structure alignee sur le questionnaire "Enquete de satisfaction
  // clients : evaluation du parcours client" transmis par la Qualite
  // (Marelle) et valide par la DG.
  //
  // Les anciennes colonnes (note_accueil, note_attente, note_conseiller,
  // note_traitement, note_applications) sont conservees pour ne pas
  // casser les donnees deja collectees avec les anciens questionnaires,
  // mais ne sont plus utilisees par le nouveau formulaire.
  // note_globale, score_nps et commentaire sont reutilises tels quels.
  db.run(`CREATE TABLE IF NOT EXISTS reponses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enquete_id INTEGER,

    -- ancien schema, conserve pour compatibilite avec l'historique
    note_accueil INTEGER,
    note_attente INTEGER,
    note_conseiller INTEGER,
    note_traitement INTEGER,
    note_applications INTEGER,

    -- 1. Profil du client
    secteur_activite TEXT,
    anciennete_client TEXT,

    -- 2. Derniere experience avec la BCEG
    objet_demarche TEXT,
    canal_demarche TEXT,

    -- 3. Accueil et premiere prise en charge (notes 1 a 5)
    note_qualite_accueil INTEGER,
    note_courtoisie INTEGER,
    note_disponibilite INTEGER,
    note_rapidite_prise_en_charge INTEGER,
    note_orientation INTEGER,
    temps_attente TEXT,

    -- 4. Prise en charge par le conseiller
    conseiller_joignable TEXT,
    conseiller_ecoute TEXT,
    clarte_informations INTEGER,
    traite_premier_contact TEXT,
    raison_non_traite TEXT,
    informe_avancement TEXT,

    -- 5. Traitement de la demande
    delai_traitement INTEGER,
    delai_respecte TEXT,
    reponse_adaptee TEXT,

    -- 6. Suivi apres la realisation du service
    suivi_apres_service TEXT,

    -- 7. Satisfaction globale du parcours
    note_globale INTEGER,
    score_nps INTEGER,

    -- 8. Avis libre
    commentaire TEXT,

    date_reponse DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (enquete_id) REFERENCES enquetes(id)
  )`);

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

  // Colonnes gestionnaire (deja en place cote operations)
  db.run(`ALTER TABLE operations ADD COLUMN code_gestionnaire TEXT`, function() {});
  db.run(`ALTER TABLE operations ADD COLUMN nom_gestionnaire TEXT`, function() {});

  // Migration : ajout des nouvelles colonnes si la table reponses
  // existe deja avec l'ancien schema (base deja en production).
  // Chaque ALTER echoue silencieusement si la colonne existe deja.
  const nouvellesColonnes = [
    'secteur_activite TEXT',
    'anciennete_client TEXT',
    'objet_demarche TEXT',
    'canal_demarche TEXT',
    'note_qualite_accueil INTEGER',
    'note_courtoisie INTEGER',
    'note_disponibilite INTEGER',
    'note_rapidite_prise_en_charge INTEGER',
    'note_orientation INTEGER',
    'temps_attente TEXT',
    'conseiller_joignable TEXT',
    'conseiller_ecoute TEXT',
    'clarte_informations INTEGER',
    'traite_premier_contact TEXT',
    'raison_non_traite TEXT',
    'informe_avancement TEXT',
    'delai_traitement INTEGER',
    'delai_respecte TEXT',
    'reponse_adaptee TEXT',
    'suivi_apres_service TEXT'
  ];
  nouvellesColonnes.forEach(function(colDef) {
    db.run(`ALTER TABLE reponses ADD COLUMN ${colDef}`, function() {});
  });

  console.log('Base de donnees initialisee avec succes (schema Qualite)');
});

module.exports = db;
