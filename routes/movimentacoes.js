const express = require('express');
const Movimentacao = require('../models/Movimentacao');
const Lote = require('../models/Lote');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Listar todas as movimentações
router.get('/', authenticateToken, (req, res) => {
  Movimentacao.getAll((err, movimentacoes) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar movimentações' });
    }
    res.json(movimentacoes);
  });
});

// Buscar movimentações por lote
router.get('/lote/:loteId', authenticateToken, (req, res) => {
  Movimentacao.getByLote(req.params.loteId, (err, movimentacoes) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar movimentações' });
    }
    res.json(movimentacoes);
  });
});

// Criar movimentação (entrada ou saída)
router.post('/', authenticateToken, (req, res) => {
  const { lote_id, tipo, quantidade, motivo, observacoes } = req.body;
  const usuario_id = req.user.id;

  // Validar tipo de movimentação
  const tiposValidos = ['ENTRADA', 'SAIDA', 'DOACAO', 'EMPRESTIMO', 'VENCIMENTO', 'AJUSTE'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de movimentação inválido' });
  }

  // Buscar lote para atualizar quantidades
  Lote.getById(lote_id, (err, lote) => {
    if (err || !lote) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }

    let novaQuantidadeFechado = lote.quantidade_fechado;
    let novaQuantidadeUso = lote.quantidade_uso;

    if (tipo === 'ENTRADA') {
      novaQuantidadeFechado += quantidade;
    } else {
      // Para saída, priorizar estoque em uso, depois fechado
      if (novaQuantidadeUso >= quantidade) {
        novaQuantidadeUso -= quantidade;
      } else {
        const restante = quantidade - novaQuantidadeUso;
        novaQuantidadeUso = 0;
        novaQuantidadeFechado -= restante;
      }
    }

    if (novaQuantidadeFechado < 0 || novaQuantidadeUso < 0) {
      return res.status(400).json({ error: 'Quantidade insuficiente em estoque' });
    }

    // Criar movimentação
    Movimentacao.create({ 
      lote_id, 
      tipo, 
      quantidade, 
      motivo, 
      usuario_id, 
      observacoes 
    }, function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao criar movimentação' });
      }

      // Atualizar quantidades do lote
      Lote.atualizarQuantidades(lote_id, novaQuantidadeFechado, novaQuantidadeUso, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao atualizar lote' });
        }
        res.status(201).json({ 
          id: this.lastID, 
          message: 'Movimentação registrada com sucesso' 
        });
      });
    });
  });
});

module.exports = router;
