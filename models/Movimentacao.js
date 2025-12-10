const { db } = require('../database/init');

class Movimentacao {
  static getAll(callback) {
    const query = `
      SELECT 
        m.*,
        l.numero_lote,
        p.codigo,
        p.descricao,
        u.nome as usuario_nome
      FROM movimentacoes m
      JOIN lotes l ON m.lote_id = l.id
      JOIN produtos p ON l.produto_id = p.id
      JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.data_movimentacao DESC
    `;
    db.all(query, callback);
  }

  static getByLote(loteId, callback) {
    const query = `
      SELECT 
        m.*,
        u.nome as usuario_nome
      FROM movimentacoes m
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.lote_id = ?
      ORDER BY m.data_movimentacao DESC
    `;
    db.all(query, [loteId], callback);
  }

  static create(data, callback) {
    const { lote_id, tipo, quantidade, motivo, usuario_id, observacoes } = data;
    db.run(
      `INSERT INTO movimentacoes (lote_id, tipo, quantidade, motivo, usuario_id, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lote_id, tipo, quantidade, motivo || '', usuario_id, observacoes || ''],
      callback
    );
  }
}

module.exports = Movimentacao;
