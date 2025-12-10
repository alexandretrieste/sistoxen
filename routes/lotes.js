const express = require('express');
const Lote = require('../models/Lote');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Listar todos os lotes
router.get('/', authenticateToken, (req, res) => {
  Lote.getAll((err, lotes) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar lotes' });
    }
    res.json(lotes);
  });
});

// Buscar lotes por produto
router.get('/produto/:produtoId', authenticateToken, (req, res) => {
  Lote.getByProduto(req.params.produtoId, (err, lotes) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar lotes' });
    }
    res.json(lotes);
  });
});

// Buscar lote por ID
router.get('/:id', authenticateToken, (req, res) => {
  Lote.getById(req.params.id, (err, lote) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar lote' });
    }
    if (!lote) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }
    res.json(lote);
  });
});

// Criar novo lote
router.post('/', authenticateToken, (req, res) => {
  Lote.create(req.body, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Lote já existe para este produto' });
      }
      return res.status(500).json({ error: 'Erro ao criar lote' });
    }
    res.status(201).json({ id: this.lastID, message: 'Lote criado com sucesso' });
  });
});

// Abrir lote (requer justificativa se já existe outro aberto)
router.post('/:id/abrir', authenticateToken, (req, res) => {
  const { justificativa } = req.body;
  
  Lote.getById(req.params.id, (err, lote) => {
    if (err || !lote) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }

    if (lote.aberto) {
      return res.status(400).json({ error: 'Lote já está aberto' });
    }

    // Verificar se já existe lote aberto para o produto
    Lote.getLotesAbertoPorProduto(lote.produto_id, (err, lotesAbertos) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao verificar lotes abertos' });
      }

      if (lotesAbertos.length > 0 && !justificativa) {
        return res.status(400).json({ 
          error: 'Já existe lote aberto para este produto. Justificativa obrigatória.' 
        });
      }

      Lote.abrir(req.params.id, justificativa || null, function(err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao abrir lote' });
        }
        res.json({ message: 'Lote aberto com sucesso' });
      });
    });
  });
});

// Atualizar quantidades do lote
router.put('/:id/quantidades', authenticateToken, (req, res) => {
  const { quantidade_fechado, quantidade_uso } = req.body;
  
  Lote.atualizarQuantidades(req.params.id, quantidade_fechado, quantidade_uso, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao atualizar quantidades' });
    }
    res.json({ message: 'Quantidades atualizadas com sucesso' });
  });
});

// Atualizar lote completo
router.put('/:id', authenticateToken, (req, res) => {
  Lote.update(req.params.id, req.body, function(err) {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar lote' });
    if (this.changes === 0) return res.status(404).json({ error: 'Lote não encontrado' });
    res.json({ message: 'Lote atualizado com sucesso' });
  });
});

// Update armazenamento
router.put('/:id/armazenamento', authenticateToken, (req, res) => {
  const { armazenamento } = req.body;
  
  Lote.atualizarArmazenamento(req.params.id, armazenamento, function(err) {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar armazenamento' });
    if (this.changes === 0) return res.status(404).json({ error: 'Lote não encontrado' });
    res.json({ message: 'Armazenamento atualizado com sucesso' });
  });
});

// Toggle licitar
router.put('/:id/licitar', authenticateToken, (req, res) => {
  const db = require('../database/init').db;
  const { licitar } = req.body;
  
  db.run(
    'UPDATE lotes SET licitar = ? WHERE id = ?',
    [licitar, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar licitar' });
      res.json({ message: 'Licitar atualizado' });
    }
  );
});

// Deletar lote
router.delete('/:id', authenticateToken, (req, res) => {
  const Movimentacao = require('../models/Movimentacao');
  
  Lote.getById(req.params.id, (err, lote) => {
    if (err || !lote) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }
    
    const quantidadeTotal = (lote.quantidade_fechado || 0) + (lote.quantidade_uso || 0);
    
    // Registrar movimentação de exclusão antes de deletar
    Movimentacao.create({
      lote_id: lote.id,
      tipo: 'EXCLUSAO',
      quantidade: quantidadeTotal,
      motivo: 'Lote excluído do sistema',
      usuario_id: req.user.id,
      observacoes: `Lote ${lote.numero_lote} removido`
    }, (errMov) => {
      if (errMov) {
        console.error('Erro ao registrar movimentação de exclusão:', errMov);
      }
      
      Lote.delete(req.params.id, function(err2) {
        if (err2) {
          return res.status(500).json({ error: 'Erro ao deletar lote' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Lote não encontrado' });
        }
        res.json({ message: 'Lote deletado com sucesso' });
      });
    });
  });
});

module.exports = router;
