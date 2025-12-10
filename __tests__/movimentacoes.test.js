const request = require('supertest');
const express = require('express');
const movimentacoesRoutes = require('../routes/movimentacoes');

jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  }
}));

jest.mock('../models/Movimentacao');
jest.mock('../models/Lote');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'admin' };
    next();
  }
}));

const { db } = require('../database/init');
const Movimentacao = require('../models/Movimentacao');
const Lote = require('../models/Lote');

const app = express();
app.use(express.json());
app.use('/api/movimentacoes', movimentacoesRoutes);

describe('Movimentações Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/movimentacoes', () => {
    test('Deve retornar lista de movimentações', async () => {
      const mockMovimentacoes = [
        { id: 1, lote_id: 1, tipo: 'ENTRADA', quantidade: 10, data: '2025-12-01' },
        { id: 2, lote_id: 2, tipo: 'SAIDA', quantidade: 5, data: '2025-12-02' }
      ];

      Movimentacao.getAll.mockImplementation((callback) => {
        callback(null, mockMovimentacoes);
      });

      const response = await request(app).get('/api/movimentacoes');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].tipo).toBe('ENTRADA');
    });
  });

  describe('GET /api/movimentacoes/lote/:loteId', () => {
    test('Deve retornar movimentações por lote', async () => {
      const mockMovimentacoes = [
        { id: 1, lote_id: 1, tipo: 'ENTRADA', quantidade: 10 }
      ];

      Movimentacao.getByLote.mockImplementation((loteId, callback) => {
        callback(null, mockMovimentacoes);
      });

      const response = await request(app).get('/api/movimentacoes/lote/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].lote_id).toBe(1);
    });
  });

  describe('POST /api/movimentacoes', () => {
    test('Deve criar movimentação de ENTRADA com sucesso', async () => {
      const mockLote = { 
        id: 1, 
        quantidade_fechado: 10, 
        quantidade_uso: 5 
      };

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      Movimentacao.create.mockImplementation(function(data, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      Lote.atualizarQuantidades.mockImplementation((id, fechado, uso, callback) => {
        callback(null);
      });

      const novaMovimentacao = {
        lote_id: 1,
        tipo: 'ENTRADA',
        quantidade: 10,
        motivo: 'Reposição de estoque'
      };

      const response = await request(app)
        .post('/api/movimentacoes')
        .send(novaMovimentacao);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Movimentação registrada com sucesso');
    });

    test('Deve criar movimentação de SAIDA com sucesso', async () => {
      const mockLote = { 
        id: 1, 
        quantidade_fechado: 10, 
        quantidade_uso: 5 
      };

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      Movimentacao.create.mockImplementation(function(data, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      Lote.atualizarQuantidades.mockImplementation((id, fechado, uso, callback) => {
        callback(null);
      });

      const novaMovimentacao = {
        lote_id: 1,
        tipo: 'SAIDA',
        quantidade: 3,
        motivo: 'Uso no laboratório'
      };

      const response = await request(app)
        .post('/api/movimentacoes')
        .send(novaMovimentacao);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Movimentação registrada com sucesso');
    });

    test('Deve retornar erro 400 para tipo inválido', async () => {
      const response = await request(app)
        .post('/api/movimentacoes')
        .send({
          lote_id: 1,
          tipo: 'INVALIDO',
          quantidade: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tipo de movimentação inválido');
    });

    test('Deve retornar erro 404 se lote não existe', async () => {
      Lote.getById.mockImplementation((id, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .post('/api/movimentacoes')
        .send({
          lote_id: 999,
          tipo: 'ENTRADA',
          quantidade: 10
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lote não encontrado');
    });

    test('Deve aceitar todos os tipos válidos', async () => {
      const tiposValidos = ['ENTRADA', 'SAIDA', 'DOACAO', 'EMPRESTIMO', 'VENCIMENTO', 'AJUSTE'];
      
      const mockLote = { id: 1, quantidade_fechado: 100, quantidade_uso: 50 };
      
      for (const tipo of tiposValidos) {
        Lote.getById.mockImplementation((id, callback) => {
          callback(null, mockLote);
        });

        Movimentacao.create.mockImplementation(function(data, callback) {
          this.lastID = 1;
          callback.call(this, null);
        });

        Lote.atualizarQuantidades.mockImplementation((id, fechado, uso, callback) => {
          callback(null);
        });

        const response = await request(app)
          .post('/api/movimentacoes')
          .send({
            lote_id: 1,
            tipo: tipo,
            quantidade: 5,
            motivo: `Teste tipo ${tipo}`
          });

        expect(response.status).toBe(201);
      }
    });

    test('Deve retornar erro 500 ao buscar movimentações', async () => {
      Movimentacao.getAll.mockImplementation((callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).get('/api/movimentacoes');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar movimentações');
    });

    test('Deve retornar erro 500 ao buscar movimentações por lote', async () => {
      Movimentacao.getByLote.mockImplementation((loteId, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).get('/api/movimentacoes/lote/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar movimentações');
    });

    test('Deve retornar erro 500 ao buscar lote', async () => {
      Lote.getById.mockImplementation((id, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .post('/api/movimentacoes')
        .send({
          lote_id: 1,
          tipo: 'ENTRADA',
          quantidade: 10,
          motivo: 'Teste'
        });

      expect(response.status).toBe(404);
    });

    test('Deve retornar erro 500 ao criar movimentação', async () => {
      const mockLote = { id: 1, quantidade_fechado: 10, quantidade_uso: 5 };

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      Movimentacao.create.mockImplementation((data, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .post('/api/movimentacoes')
        .send({
          lote_id: 1,
          tipo: 'ENTRADA',
          quantidade: 10,
          motivo: 'Teste'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao criar movimentação');
    });

    test('Deve retornar erro 500 ao atualizar lote', async () => {
      const mockLote = { id: 1, quantidade_fechado: 10, quantidade_uso: 5 };

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      Movimentacao.create.mockImplementation(function(data, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      Lote.atualizarQuantidades.mockImplementation((id, fechado, uso, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .post('/api/movimentacoes')
        .send({
          lote_id: 1,
          tipo: 'ENTRADA',
          quantidade: 10,
          motivo: 'Teste'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao atualizar lote');
    });

    test('Deve retornar erro 400 para quantidade insuficiente', async () => {
      const mockLote = { id: 1, quantidade_fechado: 5, quantidade_uso: 3 };

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      const response = await request(app)
        .post('/api/movimentacoes')
        .send({
          lote_id: 1,
          tipo: 'SAIDA',
          quantidade: 20,
          motivo: 'Teste'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Quantidade insuficiente em estoque');
    });
  });
});
