const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base de donnees
require('./models/database');

// Routes
const enqueteRouter = require('./routes/enquete');
const dashboardRouter = require('./routes/dashboard');
const excelRouter = require('./routes/excel');
const smsRouter = require('./routes/sms');

app.use('/enquete', enqueteRouter);
app.use('/dashboard', dashboardRouter);
app.use('/excel', excelRouter);
app.use('/sms', smsRouter);

// Redirection racine vers dashboard
app.get('/', (req, res) => res.redirect('/dashboard'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur BCEG demarre sur le port ${PORT}`);
  console.log(`Dashboard : http://localhost:${PORT}/dashboard`);
});
