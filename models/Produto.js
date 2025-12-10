const { db } = require('../database/init');

class Produto {
  static getAll(callback) {
    db.all('SELECT * FROM produtos ORDER BY descricao', callback);
  }

  static getById(id, callback) {
    db.get('SELECT * FROM produtos WHERE id = ?', [id], callback);
  }

  static create(data, callback) {
    const { codigo, descricao, tipo_unidade, fabricante, cmm, estoque_minimo } = data;
    db.run(
      `INSERT INTO produtos (codigo, descricao, tipo_unidade, fabricante, cmm, estoque_minimo) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [codigo, descricao, tipo_unidade, fabricante || '', cmm || 0, estoque_minimo || 0],
      callback
    );
  }

  static update(id, data, callback) {
    const { codigo, descricao, tipo_unidade, fabricante, cmm, estoque_minimo } = data;
    db.run(
      `UPDATE produtos 
       SET codigo = ?, descricao = ?, tipo_unidade = ?, fabricante = ?, cmm = ?, estoque_minimo = ?, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [codigo, descricao, tipo_unidade, fabricante, cmm, estoque_minimo, id],
      callback
    );
  }

  static delete(id, callback) {
    db.run('DELETE FROM produtos WHERE id = ?', [id], callback);
  }

  static getEstoque(callback) {
    const query = `
      SELECT 
        p.id,
        p.codigo,
        p.descricao,
        p.tipo_unidade,
        p.fabricante,
        p.cmm,
        p.estoque_minimo,
        COALESCE(SUM(l.quantidade_fechado), 0) as estoque_fechado,
        COALESCE(SUM(l.quantidade_uso), 0) as estoque_uso,
        COALESCE(SUM(l.quantidade_fechado + l.quantidade_uso), 0) as estoque_total,
        COUNT(DISTINCT l.numero_lote) as total_lotes
      FROM produtos p
      LEFT JOIN lotes l ON p.id = l.produto_id
      GROUP BY p.id
      ORDER BY p.descricao
    `;
    db.all(query, callback);
  }
}

module.exports = Produto;
