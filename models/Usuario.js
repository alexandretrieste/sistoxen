const { db } = require('../database/init');

class Usuario {
  static getAll(callback) {
    db.all('SELECT id, username, nome, email, ativo, created_at FROM usuarios ORDER BY nome', callback);
  }

  static getById(id, callback) {
    db.get('SELECT id, username, nome, email, ativo, created_at FROM usuarios WHERE id = ?', [id], callback);
  }

  static getByUsername(username, callback) {
    db.get('SELECT * FROM usuarios WHERE username = ?', [username], callback);
  }

  static create(data, callback) {
    const { username, password, nome, email } = data;
    db.run(
      'INSERT INTO usuarios (username, password, nome, email) VALUES (?, ?, ?, ?)',
      [username, password, nome, email],
      callback
    );
  }

  static update(id, data, callback) {
    const { username, nome, email, ativo } = data;
    db.run(
      'UPDATE usuarios SET username = ?, nome = ?, email = ?, ativo = ? WHERE id = ?',
      [username, nome, email, ativo, id],
      callback
    );
  }

  static updatePassword(id, hashedPassword, callback) {
    db.run(
      'UPDATE usuarios SET password = ? WHERE id = ?',
      [hashedPassword, id],
      callback
    );
  }

  static count(callback) {
    db.get('SELECT COUNT(*) as total FROM usuarios', callback);
  }
}

module.exports = Usuario;
