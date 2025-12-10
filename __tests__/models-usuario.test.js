const Usuario = require('../models/Usuario');

jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  }
}));

const { db } = require('../database/init');

describe('Usuario Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    test('Deve buscar todos os usuários', (done) => {
      const mockUsuarios = [
        { id: 1, username: 'admin', nome: 'Admin', ativo: true },
        { id: 2, username: 'user1', nome: 'User 1', ativo: true }
      ];

      db.all.mockImplementation((query, callback) => {
        callback(null, mockUsuarios);
      });

      Usuario.getAll((err, usuarios) => {
        expect(err).toBeNull();
        expect(usuarios).toEqual(mockUsuarios);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining('SELECT id, username, nome, ativo'),
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('getById', () => {
    test('Deve buscar usuário por ID', (done) => {
      const mockUsuario = { id: 1, username: 'admin', nome: 'Admin', ativo: true };

      db.get.mockImplementation((query, params, callback) => {
        callback(null, mockUsuario);
      });

      Usuario.getById(1, (err, usuario) => {
        expect(err).toBeNull();
        expect(usuario).toEqual(mockUsuario);
        expect(db.get).toHaveBeenCalledWith(
          expect.stringContaining('WHERE id = ?'),
          [1],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('getByUsername', () => {
    test('Deve buscar usuário por username', (done) => {
      const mockUsuario = { id: 1, username: 'admin', password: 'hash', nome: 'Admin' };

      db.get.mockImplementation((query, params, callback) => {
        callback(null, mockUsuario);
      });

      Usuario.getByUsername('admin', (err, usuario) => {
        expect(err).toBeNull();
        expect(usuario).toEqual(mockUsuario);
        expect(db.get).toHaveBeenCalledWith(
          expect.stringContaining('WHERE username = ?'),
          ['admin'],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('create', () => {
    test('Deve criar novo usuário', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.lastID = 5;
        callback.call(this, null);
      });

      const data = {
        username: 'newuser',
        password: 'hashedPassword',
        nome: 'New User'
      };

      Usuario.create(data, function(err) {
        expect(err).toBeNull();
        expect(this.lastID).toBe(5);
        expect(db.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO usuarios'),
          ['newuser', 'hashedPassword', 'New User'],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('update', () => {
    test('Deve atualizar usuário', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const data = {
        username: 'updateduser',
        nome: 'Updated Name',
        ativo: false
      };

      Usuario.update(1, data, function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
        expect(db.run).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE usuarios SET'),
          ['updateduser', 'Updated Name', false, 1],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('updatePassword', () => {
    test('Deve atualizar senha do usuário', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      Usuario.updatePassword(1, 'newHashedPassword', function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
        expect(db.run).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE usuarios SET password'),
          ['newHashedPassword', 1],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('count', () => {
    test('Deve contar total de usuários', (done) => {
      db.get.mockImplementation((query, callback) => {
        callback(null, { total: 7 });
      });

      Usuario.count((err, result) => {
        expect(err).toBeNull();
        expect(result.total).toBe(7);
        expect(db.get).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(*)'),
          expect.any(Function)
        );
        done();
      });
    });
  });
});
