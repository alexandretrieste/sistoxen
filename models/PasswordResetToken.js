const { db } = require('../database/init');

class PasswordResetToken {
  static create({ user_id, token_hash, expires_at, ip }, callback) {
    db.run(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip) VALUES (?, ?, ?, ?)',
      [user_id, token_hash, expires_at, ip],
      callback
    );
  }

  static findValid(user_id, token_hash, callback) {
    db.get(
      `SELECT * FROM password_reset_tokens
       WHERE user_id = ? AND token_hash = ? AND used = 0 AND expires_at > datetime('now')
       ORDER BY id DESC LIMIT 1`,
      [user_id, token_hash],
      callback
    );
  }

  static markUsed(id, callback) {
    db.run(
      `UPDATE password_reset_tokens SET used = 1, used_at = datetime('now') WHERE id = ?`,
      [id],
      callback
    );
  }

  static countRecentByUser(user_id, callback) {
    db.get(
      `SELECT COUNT(*) as total FROM password_reset_tokens
       WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`,
      [user_id],
      callback
    );
  }
}

module.exports = PasswordResetToken;
