const express = require('express');
const Produto = require('../models/Produto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Listar todos os produtos
router.get('/', authenticateToken, (req, res) => {
  Produto.getAll((err, produtos) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
    res.json(produtos);
  });
});

// Obter estoque consolidado - DEVE VIR ANTES DA ROTA /:id
router.get('/estoque/consolidado', authenticateToken, (req, res) => {
  Produto.getEstoque((err, estoque) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar estoque' });
    }
    res.json(estoque);
  });
});

// Buscar produto por ID
router.get('/:id', authenticateToken, (req, res) => {
  Produto.getById(req.params.id, (err, produto) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar produto' });
    }
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(produto);
  });
});

// Criar novo produto
router.post('/', authenticateToken, (req, res) => {
  Produto.create(req.body, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Código de produto já existe' });
      }
      return res.status(500).json({ error: 'Erro ao criar produto' });
    }
    res.status(201).json({ id: this.lastID, message: 'Produto criado com sucesso' });
  });
});

// Atualizar produto
router.put('/:id', authenticateToken, (req, res) => {
  Produto.update(req.params.id, req.body, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json({ message: 'Produto atualizado com sucesso' });
  });
});

// Deletar produto
router.delete('/:id', authenticateToken, (req, res) => {
  Produto.delete(req.params.id, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao deletar produto' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json({ message: 'Produto deletado com sucesso' });
  });
});

module.exports = router;
