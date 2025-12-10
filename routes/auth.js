const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { SECRET_KEY } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e senha são obrigatórios' });
  }

  Usuario.getByUsername(username, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar usuário' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    if (!user.ativo) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, nome: user.nome, is_admin: user.is_admin === 1 },
        SECRET_KEY,
        { expiresIn: '8h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          nome: user.nome,
          is_admin: user.is_admin === 1
        }
      });
    });
  });
});

module.exports = router;
