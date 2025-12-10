const request = require('supertest');
const express = require('express');
const usuariosRoutes = require('../routes/usuarios');

jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  }
}));

jest.mock('../models/Usuario');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'admin' };
    next();
  }
}));

const { db } = require('../database/init');
const Usuario = require('../models/Usuario');

const app = express();
app.use(express.json());
app.use('/api/usuarios', usuariosRoutes);

describe('Usuários Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/usuarios', () => {
    test('Deve retornar lista de usuários', async () => {
      const mockUsuarios = [
        { id: 1, username: 'admin', nome: 'Administrador', ativo: true },
        { id: 2, username: 'user1', nome: 'Usuário 1', ativo: true }
      ];

      Usuario.getAll.mockImplementation((callback) => {
        callback(null, mockUsuarios);
      });

      const response = await request(app).get('/api/usuarios');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].username).toBe('admin');
    });

    test('Deve retornar erro 500 em caso de falha', async () => {
      Usuario.getAll.mockImplementation((callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app).get('/api/usuarios');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar usuários');
    });
  });

  describe('GET /api/usuarios/:id', () => {
    test('Deve retornar usuário por ID', async () => {
      const mockUsuario = { id: 1, username: 'admin', nome: 'Administrador', ativo: true };

      Usuario.getById.mockImplementation((id, callback) => {
        callback(null, mockUsuario);
      });

      const response = await request(app).get('/api/usuarios/1');

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('admin');
    });

    test('Deve retornar erro 404 se usuário não existir', async () => {
      Usuario.getById.mockImplementation((id, callback) => {
        callback(null, null);
      });

      const response = await request(app).get('/api/usuarios/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Usuário não encontrado');
    });
  });

  describe('POST /api/usuarios', () => {
    test('Deve criar novo usuário com sucesso', async () => {
      Usuario.count.mockImplementation((callback) => {
        callback(null, { total: 5 });
      });

      Usuario.create.mockImplementation(function(data, callback) {
        this.lastID = 3;
        callback.call(this, null);
      });

      const novoUsuario = {
        username: 'newuser',
        password: 'senha123',
        nome: 'Novo Usuário'
      };

      const response = await request(app)
        .post('/api/usuarios')
        .send(novoUsuario);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(3);
    });

    test('Deve retornar erro 400 se já existem 10 usuários', async () => {
      Usuario.count.mockImplementation((callback) => {
        callback(null, { total: 10 });
      });

      const response = await request(app)
        .post('/api/usuarios')
        .send({ username: 'test', password: 'test', nome: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Limite máximo de 10 usuários atingido');
    });

    test('Deve retornar erro 400 se username já existe', async () => {
      Usuario.count.mockImplementation((callback) => {
        callback(null, { total: 5 });
      });

      Usuario.create.mockImplementation((data, callback) => {
        const error = new Error('UNIQUE constraint failed');
        callback(error);
      });

      const response = await request(app)
        .post('/api/usuarios')
        .send({ username: 'admin', password: 'test', nome: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Nome de usuário já existe');
    });
  });

  describe('PUT /api/usuarios/:id', () => {
    test('Deve atualizar usuário existente', async () => {
      Usuario.update.mockImplementation(function(id, data, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/usuarios/1')
        .send({ username: 'admin', nome: 'Admin Updated', ativo: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Usuário atualizado com sucesso');
    });

    test('Deve retornar erro 404 se usuário não existe', async () => {
      Usuario.update.mockImplementation(function(id, data, callback) {
        this.changes = 0;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/usuarios/999')
        .send({ username: 'test', nome: 'Test', ativo: true });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Usuário não encontrado');
    });
  });

  describe('PUT /api/usuarios/:id/senha', () => {
    test('Deve atualizar senha do usuário', async () => {
      Usuario.updatePassword.mockImplementation(function(id, password, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/usuarios/1/senha')
        .send({ password: 'novaSenha123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Senha alterada com sucesso');
    });

    test('Deve retornar erro 404 se usuário não existe', async () => {
      Usuario.updatePassword.mockImplementation(function(id, password, callback) {
        this.changes = 0;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/usuarios/999/senha')
        .send({ password: 'novaSenha' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Usuário não encontrado');
    });
  });

  describe('Casos de erro adicionais', () => {
    test('GET /:id - Erro 500 ao buscar usuário', async () => {
      Usuario.getById.mockImplementation((id, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).get('/api/usuarios/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar usuário');
    });

    test('POST / - Erro 500 ao verificar contagem', async () => {
      Usuario.count.mockImplementation((callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .post('/api/usuarios')
        .send({ username: 'test', password: 'test', nome: 'Test' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao verificar quantidade de usuários');
    });

    test('POST / - Erro 500 ao criar usuário', async () => {
      Usuario.count.mockImplementation((callback) => {
        callback(null, { total: 5 });
      });

      Usuario.create.mockImplementation((data, callback) => {
        callback(new Error('Generic error'));
      });

      const response = await request(app)
        .post('/api/usuarios')
        .send({ username: 'test', password: 'test', nome: 'Test' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao criar usuário');
    });

    test('PUT /:id - Erro 500 ao atualizar usuário', async () => {
      Usuario.update.mockImplementation((id, data, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .put('/api/usuarios/1')
        .send({ nome: 'Updated' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao atualizar usuário');
    });

    test('PUT /:id/senha - Erro 500 ao alterar senha', async () => {
      Usuario.updatePassword.mockImplementation((id, password, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .put('/api/usuarios/1/senha')
        .send({ password: 'novaSenha' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao alterar senha');
    });
  });
});

