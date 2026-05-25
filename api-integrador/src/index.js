const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Importando rotas
const lutasRoutes = require('./routes/lutas');
const apostasRoutes = require('./routes/apostas');
const lutadoresRoutes = require('./routes/lutadores');
const apostadoresRoutes = require('./routes/apostadores');

// Registrando rotas
app.use('/api/lutas', lutasRoutes);
app.use('/api/apostas', apostasRoutes);
app.use('/api/lutadores', lutadoresRoutes);
app.use('/api/apostadores', apostadoresRoutes);

// Rota raiz de teste
app.get('/', (req, res) => {
  res.json({ message: 'Orquestrador Betsdosjagas online!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor orquestrador rodando na porta ${PORT}`);
});
