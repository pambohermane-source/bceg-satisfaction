const express = require('express');
const app = express();
const PORT = 3000;

const db = require('./models/database');
const excelRoutes = require('./routes/excel');
const enqueteRoutes = require('./routes/enquete');
const dashboardRoutes = require('./routes/dashboard');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.use('/excel', excelRoutes);
app.use('/enquete', enqueteRoutes);
app.use('/dashboard', dashboardRoutes);

app.listen(PORT, () => {
  console.log(`Serveur BCEG démarré sur http://localhost:${PORT}`);
});