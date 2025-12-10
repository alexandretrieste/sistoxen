const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('Deve aceitar token válido', () => {
    const token = jwt.sign({ id: 1, username: 'admin' }, 'sistoxen-secret-key-2025');
    req.headers.authorization = `Bearer ${token}`;

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(1);
  });

  test('Deve rejeitar requisição sem token', () => {
    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  test('Deve rejeitar token inválido', () => {
    req.headers.authorization = 'Bearer token-invalido';

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  test('Deve rejeitar token expirado', () => {
    const token = jwt.sign(
      { id: 1, username: 'admin' }, 
      'sistoxen-secret-key-2025',
      { expiresIn: '-1h' } // Token expirado há 1 hora
    );
    req.headers.authorization = `Bearer ${token}`;

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  test('Deve rejeitar token sem prefixo Bearer', () => {
    const token = jwt.sign({ id: 1, username: 'admin' }, 'sistoxen-secret-key-2025');
    req.headers.authorization = token;

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
