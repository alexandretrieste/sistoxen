const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRoutes = require('../routes/auth');

// Mock do banco de dados
jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    run: jest.fn()
  }
}));

const { db } = require('../database/init');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('Login com credenciais válidas deve retornar token', async () => {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const mockUser = { id: 1, username: 'admin', password: hashedPassword, nome: 'Admin', ativo: true };
      
      db.get.mockImplementation((query, params, callback) => {
        callback(null, mockUser);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('admin');
    });

    test('Login com senha incorreta deve retornar erro 401', async () => {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const mockUser = { id: 1, username: 'admin', password: hashedPassword, ativo: true };
      
      db.get.mockImplementation((query, params, callback) => {
        callback(null, mockUser);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'senhaErrada' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Usuário ou senha inválidos');
    });

    test('Login com usuário inexistente deve retornar erro 404', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'naoexiste', password: 'senha' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Usuário ou senha inválidos');
    });

    test('Login sem username deve retornar erro 400', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'senha' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username e senha são obrigatórios');
    });

    test('Login sem senha deve retornar erro 400', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username e senha são obrigatórios');
    });

    test('Erro 500 ao buscar usuário no banco', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'senha' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar usuário');
    });
  });
});
