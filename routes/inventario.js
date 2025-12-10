const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Criar novo inventário
router.post('/', authenticateToken, (req, res) => {
  const { observacoes } = req.body;
  const usuario_id = req.user.id;

  db.run(
    'INSERT INTO inventarios (usuario_id, observacoes) VALUES (?, ?)',
    [usuario_id, observacoes || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao criar inventário' });
      }

      const inventarioId = this.lastID;

      // Buscar todos os lotes para incluir no inventário
      db.all(`
        SELECT l.id, l.quantidade_fechado, l.quantidade_uso
        FROM lotes l
        ORDER BY l.produto_id, l.numero_lote
      `, (err, lotes) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar lotes' });
        }

        if (lotes.length === 0) {
          return res.status(400).json({ error: 'Não há lotes cadastrados para inventariar' });
        }

        // Inserir itens do inventário de forma síncrona
        const stmt = db.prepare(`
          INSERT INTO inventario_itens (inventario_id, lote_id, quantidade_sistema)
          VALUES (?, ?, ?)
        `);

        let processados = 0;
        lotes.forEach(lote => {
          const quantidadeTotal = lote.quantidade_fechado + lote.quantidade_uso;
          stmt.run(inventarioId, lote.id, quantidadeTotal, (err) => {
            if (err) {
              console.error('Erro ao inserir item do inventário:', err);
            }
            processados++;
            
            // Quando todos os itens forem processados
            if (processados === lotes.length) {
              stmt.finalize();
              res.status(201).json({ 
                id: inventarioId, 
                message: 'Inventário criado com sucesso',
                totalItens: lotes.length
              });
            }
          });
        });
      });
    }
  );
});

// Listar inventários
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      i.*,
      u.nome as usuario_nome,
      COUNT(ii.id) as total_itens
    FROM inventarios i
    JOIN usuarios u ON i.usuario_id = u.id
    LEFT JOIN inventario_itens ii ON i.id = ii.inventario_id
    GROUP BY i.id
    ORDER BY i.data_inventario DESC
  `, (err, inventarios) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar inventários' });
    }
    res.json(inventarios);
  });
});

// Buscar detalhes de um inventário
router.get('/:id', authenticateToken, (req, res) => {
  // Buscar dados do inventário
  db.get(
    'SELECT * FROM inventarios WHERE id = ?',
    [req.params.id],
    (err, inventario) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar inventário' });
      }
      if (!inventario) {
        return res.status(404).json({ error: 'Inventário não encontrado' });
      }

      // Buscar itens do inventário
      db.all(`
        SELECT 
          ii.*,
          l.numero_lote,
          p.codigo,
          p.descricao,
          p.tipo_unidade
        FROM inventario_itens ii
        JOIN lotes l ON ii.lote_id = l.id
        JOIN produtos p ON l.produto_id = p.id
        WHERE ii.inventario_id = ?
        ORDER BY p.descricao, l.numero_lote
      `, [req.params.id], (err, itens) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar itens do inventário' });
        }
        res.json({
          id: inventario.id,
          data_inventario: inventario.data_inventario,
          usuario_id: inventario.usuario_id,
          observacoes: inventario.observacoes,
          finalizado: inventario.finalizado,
          itens: itens || []
        });
      });
    }
  );
});

// Atualizar contagem de um item do inventário
router.put('/item/:id', authenticateToken, (req, res) => {
  const { quantidade_contada, observacoes } = req.body;
  
  db.get(
    'SELECT quantidade_sistema FROM inventario_itens WHERE id = ?',
    [req.params.id],
    (err, item) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar item' });
      }
      if (!item) {
        return res.status(404).json({ error: 'Item não encontrado' });
      }

      const diferenca = quantidade_contada - item.quantidade_sistema;

      db.run(`
        UPDATE inventario_itens 
        SET quantidade_contada = ?, diferenca = ?, observacoes = ?
        WHERE id = ?
      `, [quantidade_contada, diferenca, observacoes || '', req.params.id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao atualizar item' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Item não encontrado' });
        }
        res.json({ message: 'Contagem atualizada com sucesso', diferenca });
      });
    }
  );
});

// Remover lote do inventário
router.delete('/item/:id', authenticateToken, (req, res) => {
  const itemId = req.params.id;

  // Primeiro, buscar o item para obter o inventario_id
  db.get(
    'SELECT inventario_id FROM inventario_itens WHERE id = ?',
    [itemId],
    (err, item) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar item' });
      }
      if (!item) {
        return res.status(404).json({ error: 'Item não encontrado' });
      }

      // Verificar se o inventário está finalizado
      db.get(
        'SELECT finalizado FROM inventarios WHERE id = ?',
        [item.inventario_id],
        (err, inventario) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao buscar inventário' });
          }
          if (inventario && inventario.finalizado) {
            return res.status(403).json({ error: 'Não é possível modificar um inventário finalizado' });
          }

          // Prosseguir com remoção
          db.run(
            'DELETE FROM inventario_itens WHERE id = ?',
            [itemId],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Erro ao remover item' });
              }
              if (this.changes === 0) {
                return res.status(404).json({ error: 'Item não encontrado' });
              }
              res.json({ message: 'Item removido com sucesso' });
            }
          );
        }
      );
    }
  );
});

// Adicionar lote ao inventário
router.post('/:id/lote/:loteId', authenticateToken, (req, res) => {
  const inventarioId = req.params.id;
  const loteId = req.params.loteId;

  // Verificar se o inventário está finalizado
  db.get(
    'SELECT finalizado FROM inventarios WHERE id = ?',
    [inventarioId],
    (err, inventario) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar inventário' });
      }
      if (!inventario) {
        return res.status(404).json({ error: 'Inventário não encontrado' });
      }
      if (inventario.finalizado) {
        return res.status(403).json({ error: 'Não é possível modificar um inventário finalizado' });
      }

      // Prosseguir com adição do lote
      db.get(
        'SELECT quantidade_fechado, quantidade_uso FROM lotes WHERE id = ?',
        [loteId],
        (err, lote) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao buscar lote' });
          }
          if (!lote) {
            return res.status(404).json({ error: 'Lote não encontrado' });
          }

          const quantidadeTotal = (lote.quantidade_fechado || 0) + (lote.quantidade_uso || 0);

          db.run(
            'INSERT INTO inventario_itens (inventario_id, lote_id, quantidade_sistema) VALUES (?, ?, ?)',
            [inventarioId, loteId, quantidadeTotal],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Erro ao adicionar lote' });
              }
              res.status(201).json({ id: this.lastID, message: 'Lote adicionado com sucesso' });
            }
          );
        }
      );
    }
  );
});


// Finalizar inventário (aceita PUT ou POST para compatibilidade com frontend)
const finalizeHandler = (req, res) => {
  const inventarioId = req.params.id;
  const usuarioId = req.user.id;

  // Primeiro, buscar todos os itens do inventário com diferenças
  db.all(`
    SELECT ii.*, l.quantidade_fechado, l.quantidade_uso
    FROM inventario_itens ii
    JOIN lotes l ON ii.lote_id = l.id
    WHERE ii.inventario_id = ? AND ii.quantidade_contada IS NOT NULL
  `, [inventarioId], (err, itens) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar itens do inventário' });
    }

    // Para cada item com diferença, atualizar o lote (zerando uso aberto) e registrar movimentação
    let processados = 0;
    const totalItens = itens.length;

    if (totalItens === 0) {
      // Nenhum item contado, apenas finaliza
      return finalizarInventario();
    }

    itens.forEach(item => {
      const quantidadeAtualTotal = (item.quantidade_fechado || 0) + (item.quantidade_uso || 0);
      const novaQuantidadeTotal = item.quantidade_contada ?? quantidadeAtualTotal;
      const diferenca = novaQuantidadeTotal - quantidadeAtualTotal;

      // Após inventário, zeramos "uso" e concentramos o saldo em "fechado" para refletir o total contado
      const novaQuantidadeFechado = Math.max(0, novaQuantidadeTotal);
      const novaQuantidadeUso = 0;

      if (diferenca !== 0 || quantidadeAtualTotal !== novaQuantidadeTotal) {
        // Atualizar o lote (zerando uso)
        db.run(
          'UPDATE lotes SET quantidade_fechado = ?, quantidade_uso = ? WHERE id = ?',
          [novaQuantidadeFechado, novaQuantidadeUso, item.lote_id],
          (err) => {
            if (err) {
              console.error('Erro ao atualizar lote:', err);
            }

            // Registrar movimentação de ajuste para rastreabilidade
            db.run(
              `INSERT INTO movimentacoes (lote_id, tipo, quantidade, motivo, usuario_id)
               VALUES (?, 'AJUSTE', ?, ?, ?)`,
              [item.lote_id, Math.abs(diferenca), `Ajuste de inventário #${inventarioId}`, usuarioId],
              (err) => {
                if (err) {
                  console.error('Erro ao registrar movimentação:', err);
                }
                processados++;
                if (processados === totalItens) {
                  finalizarInventario();
                }
              }
            );
          }
        );
      } else {
        processados++;
        if (processados === totalItens) {
          finalizarInventario();
        }
      }
    });

    function finalizarInventario() {
      db.run(
        'UPDATE inventarios SET finalizado = 1 WHERE id = ?',
        [inventarioId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Erro ao finalizar inventário' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Inventário não encontrado' });
          }
          res.json({ message: 'Inventário finalizado com sucesso! Estoque ajustado.' });
        }
      );
    }
  });
};

router.put('/:id/finalizar', authenticateToken, finalizeHandler);
router.post('/:id/finalizar', authenticateToken, finalizeHandler);

module.exports = router;
