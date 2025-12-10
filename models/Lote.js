const { db } = require('../database/init');

class Lote {
  static getAll(callback) {
    const query = `
      SELECT 
        l.*,
        p.codigo,
        p.descricao,
        p.tipo_unidade,
        p.fabricante
      FROM lotes l
      JOIN produtos p ON l.produto_id = p.id
      ORDER BY p.descricao, l.numero_lote
    `;
    db.all(query, callback);
  }

  static getByProduto(produtoId, callback) {
    const query = `
      SELECT 
        l.*,
        p.codigo,
        p.descricao,
        p.tipo_unidade,
        p.fabricante
      FROM lotes l
      JOIN produtos p ON l.produto_id = p.id
      WHERE l.produto_id = ?
      ORDER BY l.data_validade, l.numero_lote
    `;
    db.all(query, [produtoId], callback);
  }

  static getById(id, callback) {
    const query = `
      SELECT 
        l.*,
        p.codigo,
        p.descricao,
        p.tipo_unidade,
        p.fabricante
      FROM lotes l
      JOIN produtos p ON l.produto_id = p.id
      WHERE l.id = ?
    `;
    db.get(query, [id], callback);
  }

  static create(data, callback) {
    const { produto_id, numero_lote, quantidade_inicial, data_validade, fabricante } = data;
    db.run(
      `INSERT INTO lotes (produto_id, numero_lote, quantidade_inicial, quantidade_fechado, quantidade_uso, data_validade, fabricante) 
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [produto_id, numero_lote, quantidade_inicial, quantidade_inicial, data_validade, fabricante || null],
      callback
    );
  }

  static update(id, data, callback) {
    const { quantidade_fechado, quantidade_uso, data_validade, data_abertura, data_finalizacao, data_solicitacao, observacoes, fabricante } = data;
    db.run(
      `UPDATE lotes 
       SET quantidade_fechado = ?, quantidade_uso = ?, data_validade = ?,
           data_abertura = ?, data_finalizacao = ?, data_solicitacao = ?,
           observacoes = ?, fabricante = ?
       WHERE id = ?`,
      [quantidade_fechado, quantidade_uso, data_validade, data_abertura || null, data_finalizacao || null, data_solicitacao || null, observacoes || null, fabricante || null, id],
      callback
    );
  }

  static atualizarArmazenamento(id, tipo, callback) {
    db.run(
      `UPDATE lotes 
       SET tipo_armazenamento = ?
       WHERE id = ?`,
      [tipo, id],
      callback
    );
  }

  static abrir(id, justificativa, callback) {
    db.run(
      `UPDATE lotes 
       SET aberto = 1, data_abertura = CURRENT_TIMESTAMP, justificativa_abertura = ?
       WHERE id = ?`,
      [justificativa, id],
      callback
    );
  }

  static atualizarQuantidades(id, quantidade_fechado, quantidade_uso, callback) {
    db.run(
      `UPDATE lotes 
       SET quantidade_fechado = ?, quantidade_uso = ?
       WHERE id = ?`,
      [quantidade_fechado, quantidade_uso, id],
      callback
    );
  }

  static delete(id, callback) {
    db.run('DELETE FROM lotes WHERE id = ?', [id], callback);
  }

  static getLotesAbertoPorProduto(produtoId, callback) {
    db.all(
      'SELECT * FROM lotes WHERE produto_id = ? AND aberto = 1',
      [produtoId],
      callback
    );
  }
}

module.exports = Lote;
