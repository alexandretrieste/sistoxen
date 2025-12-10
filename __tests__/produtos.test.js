const request = require('supertest');
const express = require('express');
const produtosRoutes = require('../routes/produtos');
const { authenticateToken } = require('../middleware/auth');

jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  }
}));

jest.mock('../models/Produto');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'admin' };
    next();
  }
}));

const { db } = require('../database/init');
const Produto = require('../models/Produto');

const app = express();
app.use(express.json());
app.use('/api/produtos', produtosRoutes);

describe('Produtos Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/produtos', () => {
    test('Deve retornar lista de produtos', async () => {
      const mockProdutos = [
        { id: 1, codigo: 'QUI001', descricao: 'Acetona', tipo_unidade: 'L', estoque_minimo: 10 },
        { id: 2, codigo: 'QUI002', descricao: 'Álcool', tipo_unidade: 'L', estoque_minimo: 5 }
      ];

      Produto.getAll.mockImplementation((callback) => {
        callback(null, mockProdutos);
      });

      const response = await request(app).get('/api/produtos');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].codigo).toBe('QUI001');
    });

    test('Deve retornar erro 500 em caso de falha no banco', async () => {
      Produto.getAll.mockImplementation((callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app).get('/api/produtos');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar produtos');
    });
  });

  describe('GET /api/produtos/:id', () => {
    test('Deve retornar produto por ID', async () => {
      const mockProduto = { id: 1, codigo: 'QUI001', descricao: 'Acetona', tipo_unidade: 'L' };

      Produto.getById.mockImplementation((id, callback) => {
        callback(null, mockProduto);
      });

      const response = await request(app).get('/api/produtos/1');

      expect(response.status).toBe(200);
      expect(response.body.codigo).toBe('QUI001');
    });

    test('Deve retornar erro 404 se produto não existir', async () => {
      Produto.getById.mockImplementation((id, callback) => {
        callback(null, null);
      });

      const response = await request(app).get('/api/produtos/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Produto não encontrado');
    });
  });

  describe('POST /api/produtos', () => {
    test('Deve criar novo produto com sucesso', async () => {
      Produto.create.mockImplementation(function(data, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      const novoProduto = {
        codigo: 'QUI003',
        descricao: 'Ácido Clorídrico',
        tipo_unidade: 'L',
        estoque_minimo: 5,
        fabricante: 'Lab XYZ'
      };

      const response = await request(app)
        .post('/api/produtos')
        .send(novoProduto);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(1);
      expect(response.body.message).toBe('Produto criado com sucesso');
    });

    test('Deve retornar erro 400 se código já existe', async () => {
      Produto.create.mockImplementation((data, callback) => {
        const error = new Error('UNIQUE constraint failed');
        error.message = 'UNIQUE constraint failed';
        callback(error);
      });

      const response = await request(app)
        .post('/api/produtos')
        .send({ codigo: 'QUI001', descricao: 'Test', tipo_unidade: 'L' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Código de produto já existe');
    });
  });

  describe('PUT /api/produtos/:id', () => {
    test('Deve atualizar produto existente', async () => {
      Produto.update.mockImplementation(function(id, data, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/produtos/1')
        .send({ codigo: 'QUI001', descricao: 'Acetona Pura', tipo_unidade: 'L', estoque_minimo: 15 });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Produto atualizado com sucesso');
    });

    test('Deve retornar erro 404 se produto não existe', async () => {
      Produto.update.mockImplementation(function(id, data, callback) {
        this.changes = 0;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/produtos/999')
        .send({ codigo: 'QUI999', descricao: 'Teste', tipo_unidade: 'L' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Produto não encontrado');
    });
  });

  describe('DELETE /api/produtos/:id', () => {
    test('Deve deletar produto existente', async () => {
      Produto.delete.mockImplementation(function(id, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app).delete('/api/produtos/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Produto deletado com sucesso');
    });

    test('Deve retornar erro 404 se produto não existe', async () => {
      Produto.delete.mockImplementation(function(id, callback) {
        this.changes = 0;
        callback.call(this, null);
      });

      const response = await request(app).delete('/api/produtos/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Produto não encontrado');
    });

    test('Deve retornar erro 500 em caso de falha no banco', async () => {
      Produto.delete.mockImplementation((id, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).delete('/api/produtos/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao deletar produto');
    });
  });

  describe('GET /api/produtos/estoque/consolidado', () => {
    test('Deve retornar estoque consolidado', async () => {
      const mockEstoque = [
        { id: 1, nome: 'Produto A', total: 100 }
      ];

      Produto.getEstoque.mockImplementation((callback) => {
        callback(null, mockEstoque);
      });

      const response = await request(app).get('/api/produtos/estoque/consolidado');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    test('Deve retornar erro 500 em caso de falha', async () => {
      Produto.getEstoque.mockImplementation((callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).get('/api/produtos/estoque/consolidado');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar estoque');
    });
  });

  describe('Erros adicionais', () => {
    test('GET /:id - Deve retornar erro 500 em caso de falha no banco', async () => {
      Produto.getById.mockImplementation((id, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).get('/api/produtos/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar produto');
    });

    test('POST / - Deve retornar erro 500 em caso de falha genérica', async () => {
      Produto.create.mockImplementation((data, callback) => {
        callback(new Error('Generic error'));
      });

      const response = await request(app)
        .post('/api/produtos')
        .send({ codigo: 'P001', nome: 'Test' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao criar produto');
    });

    test('PUT /:id - Deve retornar erro 500 em caso de falha', async () => {
      Produto.update.mockImplementation((id, data, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .put('/api/produtos/1')
        .send({ nome: 'Updated' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao atualizar produto');
    });
  });
});
