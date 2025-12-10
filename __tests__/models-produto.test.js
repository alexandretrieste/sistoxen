const Produto = require('../models/Produto');

jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  }
}));

const { db } = require('../database/init');

describe('Produto Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    test('Deve buscar todos os produtos', (done) => {
      const mockProdutos = [
        { id: 1, codigo: 'P001', descricao: 'Produto 1' },
        { id: 2, codigo: 'P002', descricao: 'Produto 2' }
      ];

      db.all.mockImplementation((query, callback) => {
        callback(null, mockProdutos);
      });

      Produto.getAll((err, produtos) => {
        expect(err).toBeNull();
        expect(produtos).toEqual(mockProdutos);
        done();
      });
    });
  });

  describe('getById', () => {
    test('Deve buscar produto por ID', (done) => {
      const mockProduto = { id: 1, codigo: 'P001', descricao: 'Produto 1' };

      db.get.mockImplementation((query, params, callback) => {
        callback(null, mockProduto);
      });

      Produto.getById(1, (err, produto) => {
        expect(err).toBeNull();
        expect(produto).toEqual(mockProduto);
        done();
      });
    });
  });

  describe('getEstoque', () => {
    test('Deve buscar estoque consolidado', (done) => {
      const mockEstoque = [
        { id: 1, codigo: 'P001', total: 100 }
      ];

      db.all.mockImplementation((query, callback) => {
        callback(null, mockEstoque);
      });

      Produto.getEstoque((err, estoque) => {
        expect(err).toBeNull();
        expect(estoque).toEqual(mockEstoque);
        done();
      });
    });
  });

  describe('create', () => {
    test('Deve criar novo produto', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.lastID = 1;
        callback.call(this, null);
      });

      Produto.create({ codigo: 'P001', descricao: 'Produto 1' }, function(err) {
        expect(err).toBeNull();
        expect(this.lastID).toBe(1);
        done();
      });
    });
  });

  describe('update', () => {
    test('Deve atualizar produto', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      Produto.update(1, { descricao: 'Atualizado' }, function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
        done();
      });
    });
  });

  describe('delete', () => {
    test('Deve deletar produto', (done) => {
      db.run.mockImplementation(function(query, params, callback) {
        this.changes = 1;
        callback.call(this, null);
      });

      Produto.delete(1, function(err) {
        expect(err).toBeNull();
        expect(this.changes).toBe(1);
        done();
      });
    });
  });
});
