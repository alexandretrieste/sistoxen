const Lote = require('../models/Lote');

jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  }
}));

const { db } = require('../database/init');

describe('Lote Model - Métodos Adicionais', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    test('Deve buscar todos os lotes', (done) => {
      const mockLotes = [
        { id: 1, numero_lote: 'L001', codigo: 'QUI001', descricao: 'Acetona' },
        { id: 2, numero_lote: 'L002', codigo: 'QUI002', descricao: 'Etanol' }
      ];

      db.all.mockImplementation((query, callback) => {
        callback(null, mockLotes);
      });

      Lote.getAll((err, lotes) => {
        expect(err).toBeNull();
        expect(lotes).toEqual(mockLotes);
        expect(lotes).toHaveLength(2);
        done();
      });
    });
  });

  describe('getById', () => {
    test('Deve buscar lote por ID', (done) => {
      const mockLote = { id: 1, numero_lote: 'L001', codigo: 'QUI001' };

      db.get.mockImplementation((query, params, callback) => {
        callback(null, mockLote);
      });

      Lote.getById(1, (err, lote) => {
        expect(err).toBeNull();
        expect(lote).toEqual(mockLote);
        done();
      });
    });
  });

  describe('getByProduto', () => {
    test('Deve buscar lotes por produto', (done) => {
      const mockLotes = [
        { id: 1, produto_id: 1, numero_lote: 'L001', quantidade_fechado: 10 },
        { id: 2, produto_id: 1, numero_lote: 'L002', quantidade_fechado: 5 }
      ];

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockLotes);
      });

      Lote.getByProduto(1, (err, lotes) => {
        expect(err).toBeNull();
        expect(lotes).toEqual(mockLotes);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining('WHERE l.produto_id = ?'),
          [1],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('abrir', () => {
    test('Deve abrir lote com justificativa', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      Lote.abrir(1, 'Justificativa de teste', function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
        expect(db.run).toHaveBeenCalledWith(
          expect.stringContaining('SET aberto = 1'),
          ['Justificativa de teste', 1],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('atualizarQuantidades', () => {
    test('Deve atualizar quantidades do lote', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      Lote.atualizarQuantidades(1, 15, 5, function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
        expect(db.run).toHaveBeenCalledWith(
          expect.stringContaining('quantidade_fechado = ?, quantidade_uso = ?'),
          [15, 5, 1],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('getLotesAbertoPorProduto', () => {
    test('Deve buscar lotes abertos por produto', (done) => {
      const mockLotes = [
        { id: 1, produto_id: 1, aberto: 1, numero_lote: 'L001' }
      ];

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockLotes);
      });

      Lote.getLotesAbertoPorProduto(1, (err, lotes) => {
        expect(err).toBeNull();
        expect(lotes).toEqual(mockLotes);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining('WHERE produto_id = ? AND aberto = 1'),
          [1],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('create', () => {
    test('Deve criar novo lote', (done) => {
      const loteData = {
        produto_id: 1,
        numero_lote: 'L003',
        quantidade_inicial: 50,
        data_validade: '2025-12-31',
        fabricante: 'Lab ABC'
      };

      db.run.mockImplementation(function(query, params, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      Lote.create(loteData, function(err) {
        expect(err).toBeNull();
        expect(this.lastID).toBe(1);
        done();
      });
    });
  });

  describe('update', () => {
    test('Deve atualizar lote', (done) => {
      const updateData = {
        quantidade_fechado: 30,
        quantidade_uso: 20,
        data_validade: '2026-01-15'
      };

      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      Lote.update(1, updateData, function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
        done();
      });
    });
  });

  describe('delete', () => {
    test('Deve deletar lote', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      Lote.delete(1, function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
        done();
      });
    });
  });

  describe('atualizarArmazenamento', () => {
    test('Deve atualizar tipo de armazenamento', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      Lote.atualizarArmazenamento(1, 'Geladeira', function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
        done();
      });
    });
  });
});
