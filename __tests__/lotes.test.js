const request = require('supertest');
const express = require('express');
const lotesRoutes = require('../routes/lotes');

jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  }
}));

jest.mock('../models/Lote');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'admin' };
    next();
  }
}));

const { db } = require('../database/init');
const Lote = require('../models/Lote');

const app = express();
app.use(express.json());
app.use('/api/lotes', lotesRoutes);

describe('Lotes Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/lotes', () => {
    test('Deve retornar lista de lotes', async () => {
      const mockLotes = [
        { id: 1, produto_id: 1, numero_lote: 'L001', quantidade_fechado: 10, quantidade_uso: 5 },
        { id: 2, produto_id: 2, numero_lote: 'L002', quantidade_fechado: 8, quantidade_uso: 2 }
      ];

      Lote.getAll.mockImplementation((callback) => {
        callback(null, mockLotes);
      });

      const response = await request(app).get('/api/lotes');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].numero_lote).toBe('L001');
    });
  });

  describe('GET /api/lotes/:id', () => {
    test('Deve retornar lote por ID', async () => {
      const mockLote = { 
        id: 1, 
        produto_id: 1, 
        numero_lote: 'L001', 
        quantidade_fechado: 10,
        quantidade_uso: 5,
        data_validade: '2025-12-31'
      };

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      const response = await request(app).get('/api/lotes/1');

      expect(response.status).toBe(200);
      expect(response.body.numero_lote).toBe('L001');
    });

    test('Deve retornar erro 404 se lote não existir', async () => {
      Lote.getById.mockImplementation((id, callback) => {
        callback(null, null);
      });

      const response = await request(app).get('/api/lotes/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lote não encontrado');
    });
  });

  describe('POST /api/lotes', () => {
    test('Deve criar novo lote com sucesso', async () => {
      Lote.create.mockImplementation(function(data, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      const novoLote = {
        produto_id: 1,
        numero_lote: 'L003',
        quantidade_inicial: 20,
        data_validade: '2026-01-01',
        fabricante: 'Lab ABC'
      };

      const response = await request(app)
        .post('/api/lotes')
        .send(novoLote);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(1);
      expect(response.body.message).toBe('Lote criado com sucesso');
    });

    test('Deve retornar erro 400 se lote já existe', async () => {
      Lote.create.mockImplementation((data, callback) => {
        const error = new Error('UNIQUE constraint failed');
        callback(error);
      });

      const response = await request(app)
        .post('/api/lotes')
        .send({ produto_id: 1, numero_lote: 'L001', quantidade_inicial: 10, data_validade: '2025-12-31' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Lote já existe para este produto');
    });
  });

  describe('PUT /api/lotes/:id', () => {
    test('Deve atualizar lote existente', async () => {
      Lote.update.mockImplementation(function(id, data, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/lotes/1')
        .send({ 
          quantidade_fechado: 15, 
          quantidade_uso: 10,
          data_validade: '2026-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Lote atualizado com sucesso');
    });

    test('Deve retornar erro 404 se lote não existe', async () => {
      Lote.update.mockImplementation(function(id, data, callback) {
        this.changes = 0;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/lotes/999')
        .send({ quantidade_fechado: 10, quantidade_uso: 5, data_validade: '2025-12-31' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lote não encontrado');
    });
  });

  describe('PUT /api/lotes/:id/armazenamento', () => {
    test('Deve atualizar tipo de armazenamento', async () => {
      Lote.atualizarArmazenamento.mockImplementation(function(id, tipo, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/lotes/1/armazenamento')
        .send({ armazenamento: '2°C-8°C' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Armazenamento atualizado com sucesso');
    });
  });

  describe('DELETE /api/lotes/:id', () => {
    test('Deve deletar lote existente', async () => {
      Lote.delete.mockImplementation(function(id, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app).delete('/api/lotes/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Lote deletado com sucesso');
    });

    test('Deve retornar erro 404 se lote não existe', async () => {
      Lote.delete.mockImplementation(function(id, callback) {
        this.changes = 0;
        callback.call(this, null);
      });

      const response = await request(app).delete('/api/lotes/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lote não encontrado');
    });
  });

  describe('POST /api/lotes/:id/abrir', () => {
    test('Deve abrir lote sem justificativa quando não há outro aberto', async () => {
      const mockLote = { id: 1, produto_id: 1, aberto: 0, numero_lote: 'L001' };

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      Lote.getLotesAbertoPorProduto.mockImplementation((produtoId, callback) => {
        callback(null, []); // Nenhum lote aberto
      });

      Lote.abrir.mockImplementation(function(id, justificativa, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .post('/api/lotes/1/abrir')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Lote aberto com sucesso');
    });

    test('Deve abrir lote com justificativa quando já existe outro aberto', async () => {
      const mockLote = { id: 1, produto_id: 1, aberto: 0, numero_lote: 'L001' };
      const mockLotesAbertos = [{ id: 2, produto_id: 1, aberto: 1 }];

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      Lote.getLotesAbertoPorProduto.mockImplementation((produtoId, callback) => {
        callback(null, mockLotesAbertos);
      });

      Lote.abrir.mockImplementation(function(id, justificativa, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .post('/api/lotes/1/abrir')
        .send({ justificativa: 'Lote anterior esgotado' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Lote aberto com sucesso');
    });

    test('Deve retornar erro 400 se já existe lote aberto sem justificativa', async () => {
      const mockLote = { id: 1, produto_id: 1, aberto: 0, numero_lote: 'L001' };
      const mockLotesAbertos = [{ id: 2, produto_id: 1, aberto: 1 }];

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      Lote.getLotesAbertoPorProduto.mockImplementation((produtoId, callback) => {
        callback(null, mockLotesAbertos);
      });

      const response = await request(app)
        .post('/api/lotes/1/abrir')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Já existe lote aberto para este produto. Justificativa obrigatória.');
    });

    test('Deve retornar erro 400 se lote já está aberto', async () => {
      const mockLote = { id: 1, produto_id: 1, aberto: 1, numero_lote: 'L001' };

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      const response = await request(app)
        .post('/api/lotes/1/abrir')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Lote já está aberto');
    });

    test('Deve retornar erro 404 se lote não existe', async () => {
      Lote.getById.mockImplementation((id, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .post('/api/lotes/1/abrir')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lote não encontrado');
    });

    test('Deve retornar erro 500 em caso de erro ao verificar lotes abertos', async () => {
      const mockLote = { id: 1, produto_id: 1, aberto: 0, numero_lote: 'L001' };

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      Lote.getLotesAbertoPorProduto.mockImplementation((produtoId, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .post('/api/lotes/1/abrir')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao verificar lotes abertos');
    });

    test('Deve retornar erro 500 em caso de erro ao abrir lote', async () => {
      const mockLote = { id: 1, produto_id: 1, aberto: 0, numero_lote: 'L001' };

      Lote.getById.mockImplementation((id, callback) => {
        callback(null, mockLote);
      });

      Lote.getLotesAbertoPorProduto.mockImplementation((produtoId, callback) => {
        callback(null, []);
      });

      Lote.abrir.mockImplementation((id, justificativa, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .post('/api/lotes/1/abrir')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao abrir lote');
    });
  });

  describe('PUT /api/lotes/:id/quantidades', () => {
    test('Deve atualizar quantidades do lote', async () => {
      Lote.atualizarQuantidades.mockImplementation(function(id, qntFechado, qntUso, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/lotes/1/quantidades')
        .send({ quantidade_fechado: 20, quantidade_uso: 10 });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Quantidades atualizadas com sucesso');
    });

    test('Deve retornar erro 500 em caso de falha', async () => {
      Lote.atualizarQuantidades.mockImplementation((id, qntFechado, qntUso, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .put('/api/lotes/1/quantidades')
        .send({ quantidade_fechado: 20, quantidade_uso: 10 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao atualizar quantidades');
    });
  });

  describe('PUT /api/lotes/:id/licitar', () => {
    test('Deve atualizar status de licitar', async () => {
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      const response = await request(app)
        .put('/api/lotes/1/licitar')
        .send({ licitar: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Licitar atualizado');
    });

    test('Deve retornar erro 500 em caso de falha', async () => {
      db.run.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .put('/api/lotes/1/licitar')
        .send({ licitar: true });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao atualizar licitar');
    });
  });

  describe('Casos de erro adicionais', () => {
    test('GET / - Erro 500 ao listar lotes', async () => {
      Lote.getAll.mockImplementation((callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).get('/api/lotes');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar lotes');
    });

    test('GET /:id - Erro 500 ao buscar lote', async () => {
      Lote.getById.mockImplementation((id, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).get('/api/lotes/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao buscar lote');
    });

    test('POST / - Erro 500 ao criar lote', async () => {
      Lote.create.mockImplementation((data, callback) => {
        callback(new Error('Generic error'));
      });

      const response = await request(app)
        .post('/api/lotes')
        .send({ numero_lote: 'L001', produto_id: 1 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao criar lote');
    });

    test('PUT /:id - Erro 500 ao atualizar lote', async () => {
      Lote.update.mockImplementation((id, data, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .put('/api/lotes/1')
        .send({ validade: '2025-12-31' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao atualizar lote');
    });

    test('PUT /:id/armazenamento - Erro 500', async () => {
      Lote.atualizarArmazenamento.mockImplementation((id, tipo, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .put('/api/lotes/1/armazenamento')
        .send({ tipo_armazenamento: 'Geladeira' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao atualizar armazenamento');
    });
  });
});
