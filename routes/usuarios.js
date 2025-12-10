const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const PasswordResetToken = require('../models/PasswordResetToken');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');

const allowTestEmails = process.env.SMTP_USE_ETHEREAL === 'true';

const router = express.Router();

// Listar usuários (somente admin)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  Usuario.getAll((err, usuarios) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
    res.json(usuarios);
  });
});

// Buscar usuário por ID (somente admin)
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  Usuario.getById(req.params.id, (err, usuario) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(usuario);
  });
});

// Criar usuário (público para cadastro, protegido para administração)
router.post('/', (req, res) => {
  const { username, password, nome, email } = req.body;

  // Verificar limite de 10 usuários
  Usuario.count((err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao verificar quantidade de usuários' });
    }

    if (result.total >= 10) {
      return res.status(400).json({ error: 'Limite máximo de 10 usuários atingido' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    Usuario.create({ username, password: hashedPassword, nome, email }, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Nome de usuário já existe' });
        }
        return res.status(500).json({ error: 'Erro ao criar usuário' });
      }
      res.status(201).json({ id: this.lastID, message: 'Usuário criado com sucesso' });
    });
  });
});

// Atualizar usuário (somente admin)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { username, nome, email, ativo, password } = req.body;
  
  // Se tem password, atualizar senha também
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    Usuario.updatePassword(req.params.id, hashedPassword, function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar senha' });
      }
      // Depois atualiza os outros dados
      Usuario.update(req.params.id, { username, nome, email, ativo }, function(err2) {
        if (err2) {
          return res.status(500).json({ error: 'Erro ao atualizar usuário' });
        }
        res.json({ message: 'Usuário atualizado com sucesso' });
      });
    });
  } else {
    Usuario.update(req.params.id, { username, nome, email, ativo }, function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar usuário' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      res.json({ message: 'Usuário atualizado com sucesso' });
    });
  }
});

// Alterar senha
router.put('/:id/senha', authenticateToken, (req, res) => {
  const { password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  Usuario.updatePassword(req.params.id, hashedPassword, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao alterar senha' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ message: 'Senha alterada com sucesso' });
  });
});

// Solicitar reset de senha (envia código por email)
router.post('/reset-solicitar', (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Usuário e email são obrigatórios' });
  }

  Usuario.getByUsername(username, (err, usuario) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar usuário' });
    if (!usuario || usuario.email !== email) {
      return res.status(404).json({ error: 'Usuário ou email não conferem' });
    }

    const continueFlow = () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const token_hash = crypto.createHash('sha256').update(code).digest('hex');
      const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

      PasswordResetToken.create({ user_id: usuario.id, token_hash, expires_at, ip }, async (err3) => {
        if (err3) return res.status(500).json({ error: 'Erro ao gerar código' });

        const html = `<p>Olá, ${usuario.nome}</p>
          <p>Use o código abaixo para redefinir sua senha. Ele expira em 15 minutos.</p>
          <h2>${code}</h2>
          <p>Se você não solicitou, ignore este email.</p>`;
        try {
          await sendMail({
            to: usuario.email,
            subject: 'SistoXen - Código de redefinição de senha',
            html,
            text: `Seu código: ${code}`
          });
        } catch (mailErr) {
          console.error('Erro ao enviar email:', mailErr);
          return res.status(500).json({ error: 'Erro ao enviar email' });
        }

        res.json({ message: 'Código enviado para o email cadastrado.' });
      });
    };

    if (allowTestEmails) {
      return continueFlow();
    }

    // Rate-limit simples: máximo 3 pedidos na última hora
    PasswordResetToken.countRecentByUser(usuario.id, (err2, result) => {
      if (err2) return res.status(500).json({ error: 'Erro ao verificar limite' });
      if (result.total >= 3) {
        return res.status(429).json({ error: 'Limite de pedidos excedido. Tente mais tarde.' });
      }
      continueFlow();
    });
  });
});

// Confirmar reset de senha
router.post('/reset-confirmar', (req, res) => {
  const { username, code, newPassword } = req.body;
  if (!username || !code || !newPassword) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  }

  Usuario.getByUsername(username, (err, usuario) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar usuário' });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    const token_hash = crypto.createHash('sha256').update(code).digest('hex');
    PasswordResetToken.findValid(usuario.id, token_hash, (err2, token) => {
      if (err2) return res.status(500).json({ error: 'Erro ao validar código' });
      if (!token) return res.status(400).json({ error: 'Código inválido ou expirado' });

      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      Usuario.updatePassword(usuario.id, hashedPassword, (err3) => {
        if (err3) return res.status(500).json({ error: 'Erro ao atualizar senha' });

        PasswordResetToken.markUsed(token.id, () => {});
        res.json({ message: 'Senha redefinida com sucesso' });
      });
    });
  });
});

module.exports = router;
