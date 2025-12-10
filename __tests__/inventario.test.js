const request = require('supertest');
const express = require('express');
const inventarioRoutes = require('../routes/inventario');

jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
    prepare: jest.fn()
  }
}));

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'admin' };
    next();
  }
}));

const { db } = require('../database/init');

const app = express();
app.use(express.json());
app.use('/api/inventario', inventarioRoutes);

describe('Inventário Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/inventario', () => {
    test('Deve retornar lista de inventários', async () => {
      const mockInventarios = [
        { id: 1, data_inicio: '2025-12-01', status: 'em_andamento', usuario_id: 1 },
        { id: 2, data_inicio: '2025-11-01', data_fim: '2025-11-01', status: 'finalizado', usuario_id: 1 }
      ];

      db.all.mockImplementation((query, callback) => {
        callback(null, mockInventarios);
      });

      const response = await request(app).get('/api/inventario');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].status).toBe('em_andamento');
    });
  });

  describe('GET /api/inventario/:id', () => {
    test('Deve retornar inventário por ID com itens', async () => {
      const mockInventario = {
        id: 1,
        data_inicio: '2025-12-01',
        status: 'em_andamento',
        usuario_id: 1
      };

      const mockItens = [
        { 
          id: 1, 
          inventario_id: 1, 
          lote_id: 1, 
          quantidade_sistema: 10, 
          quantidade_contada: 9,
          codigo: 'QUI001',
          descricao: 'Acetona'
        }
      ];

      db.get.mockImplementation((query, params, callback) => {
        callback(null, mockInventario);
      });

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockItens);
      });

      const response = await request(app).get('/api/inventario/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.itens).toHaveLength(1);
      expect(response.body.itens[0].quantidade_sistema).toBe(10);
    });

    test('Deve retornar erro 404 se inventário não existe', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app).get('/api/inventario/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Inventário não encontrado');
    });
  });

  describe('POST /api/inventario', () => {
    test('Deve criar novo inventário com sucesso', async () => {
      const mockLotes = [
        { id: 1, quantidade_fechado: 10, quantidade_uso: 5 },
        { id: 2, quantidade_fechado: 8, quantidade_uso: 2 }
      ];

      let callCount = 0;
      db.all.mockImplementation((query, callback) => {
        callback(null, mockLotes);
      });

      db.run.mockImplementation(function(query, params, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      const mockStmt = {
        run: jest.fn((inventarioId, loteId, quantidade, callback) => {
          callCount++;
          callback(null);
        }),
        finalize: jest.fn()
      };

      db.prepare = jest.fn(() => mockStmt);

      const response = await request(app).post('/api/inventario');

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(1);
      expect(response.body.message).toBe('Inventário criado com sucesso');
    });

    test('Deve retornar erro se não há lotes para inventariar', async () => {
      db.all.mockImplementation((query, callback) => {
        callback(null, []);
      });

      const response = await request(app).post('/api/inventario');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Não há lotes cadastrados para inventariar');
    });
  });

  describe('PUT /api/inventario/:id/finalizar', () => {
    test('Deve finalizar inventário com sucesso', async () => {
      // Mock para buscar itens do inventário
      db.all.mockImplementation((query, params, callback) => {
        callback(null, []); // Sem itens com diferença
      });
      
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app).put('/api/inventario/1/finalizar');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Inventário finalizado com sucesso! Estoque ajustado.');
    });

    test('Deve finalizar e ajustar estoque quando há diferenças', async () => {
      // Mock para buscar itens com diferenças
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { lote_id: 1, quantidade_sistema: 10, quantidade_contada: 8, quantidade_fechado: 10, quantidade_uso: 0 }
        ]);
      });
      
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app).put('/api/inventario/1/finalizar');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Inventário finalizado com sucesso! Estoque ajustado.');
    });

    test('Deve retornar erro 404 se inventário não existe', async () => {
      // Mock para buscar itens - retorna vazio
      db.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });
      
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 0;
        callback.call(this, null);
      });

      const response = await request(app).put('/api/inventario/999/finalizar');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Inventário não encontrado');
    });
  });

  describe('PUT /api/inventario/item/:id', () => {
    test('Deve atualizar contagem de item', async () => {
      const mockItem = { quantidade_sistema: 10 };
      
      db.get.mockImplementation((query, params, callback) => {
        callback(null, mockItem);
      });

      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/inventario/item/1')
        .send({ quantidade_contada: 8 });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Contagem atualizada com sucesso');
    });

    test('Deve retornar erro 404 se item não existe', async () => {
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 0;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/inventario/item/999')
        .send({ quantidade_contada: 5 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Item não encontrado');
    });

    test('Deve retornar erro 404 ao buscar item inexistente', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .put('/api/inventario/item/999')
        .send({ quantidade_contada: 5 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Item não encontrado');
    });

    test('Deve retornar erro 500 ao buscar item', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .put('/api/inventario/item/1')
        .send({ quantidade_contada: 5 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar item');
    });

    test('Deve retornar erro 500 ao atualizar item', async () => {
      const mockItem = { quantidade_sistema: 10 };
      
      db.get.mockImplementation((query, params, callback) => {
        callback(null, mockItem);
      });

      db.run.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .put('/api/inventario/item/1')
        .send({ quantidade_contada: 8 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao atualizar item');
    });
  });

  describe('Casos de erro adicionais', () => {
    test('GET /:id - Erro 500 ao buscar inventário', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app).get('/api/inventario/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar inventário');
    });

    test('GET /:id - Erro 500 ao buscar itens', async () => {
      const mockInventario = { id: 1, data_inventario: '2025-12-01' };

      db.get.mockImplementation((query, params, callback) => {
        callback(null, mockInventario);
      });

      db.all.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app).get('/api/inventario/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar itens do inventário');
    });

    test('POST / - Erro 500 ao criar inventário', async () => {
      db.run.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).post('/api/inventario');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao criar inventário');
    });

    test('POST / - Erro 500 ao buscar lotes', async () => {
      db.run.mockImplementation(function(query, params, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      db.all.mockImplementation((query, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app).post('/api/inventario');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar lotes');
    });

    test('PUT /:id/finalizar - Erro 500 ao buscar itens', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app).put('/api/inventario/1/finalizar');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar itens do inventário');
    });

    test('GET / - Erro 500 ao listar inventários', async () => {
      db.all.mockImplementation((query, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app).get('/api/inventario');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar inventários');
    });
  });
});
