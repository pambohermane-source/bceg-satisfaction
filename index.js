const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base de donnees
require('./models/database');

// Routes
app.use('/enquete', require('./routes/enquete'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/excel', require('./routes/excel'));
app.use('/sms', require('./routes/sms'));

// Redirection racine vers dashboard
app.get('/', (req, res) => res.redirect('/dashboard'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Serveur BCEG demarre sur le port ' + PORT);
});
