const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require('./models/database');

app.use('/enquete', require('./routes/enquete'));
app.use('/dashboard', require('./routes/dashboard'));

try {
  app.use('/excel', require('./routes/excel'));
} catch(e) { console.log('Route excel non disponible:', e.message); }

try {
  app.use('/sms', require('./routes/sms'));
} catch(e) { console.log('Route sms non disponible:', e.message); }

app.get('/', function(req, res) { res.redirect('/dashboard'); });

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Serveur BCEG demarre sur le port ' + PORT);
});
