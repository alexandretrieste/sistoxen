require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/init');

const authRoutes = require('./routes/auth');
const produtosRoutes = require('./routes/produtos');
const lotesRoutes = require('./routes/lotes');
const movimentacoesRoutes = require('./routes/movimentacoes');
const inventarioRoutes = require('./routes/inventario');
const usuariosRoutes = require('./routes/usuarios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar banco de dados
initDatabase();

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/lotes', lotesRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;
