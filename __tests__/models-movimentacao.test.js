const Movimentacao = require('../models/Movimentacao');

jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  }
}));

const { db } = require('../database/init');

describe('Movimentacao Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    test('Deve buscar todas as movimentações', (done) => {
      const mockMovimentacoes = [
        { id: 1, lote_id: 1, tipo: 'ENTRADA', quantidade: 10 },
        { id: 2, lote_id: 2, tipo: 'SAIDA', quantidade: 5 }
      ];

      db.all.mockImplementation((query, callback) => {
        callback(null, mockMovimentacoes);
      });

      Movimentacao.getAll((err, movimentacoes) => {
        expect(err).toBeNull();
        expect(movimentacoes).toEqual(mockMovimentacoes);
        done();
      });
    });
  });

  describe('getByLote', () => {
    test('Deve buscar movimentações por lote', (done) => {
      const mockMovimentacoes = [
        { id: 1, lote_id: 1, tipo: 'ENTRADA', quantidade: 10 }
      ];

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockMovimentacoes);
      });

      Movimentacao.getByLote(1, (err, movimentacoes) => {
        expect(err).toBeNull();
        expect(movimentacoes).toEqual(mockMovimentacoes);
        done();
      });
    });
  });

  describe('create', () => {
    test('Deve criar nova movimentação', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      const data = {
        lote_id: 1,
        tipo: 'ENTRADA',
        quantidade: 10,
        usuario_id: 1,
        motivo: 'Reposição'
      };

      Movimentacao.create(data, function(err) {
        expect(err).toBeNull();
        expect(this.lastID).toBe(1);
        done();
      });
    });
  });
});
