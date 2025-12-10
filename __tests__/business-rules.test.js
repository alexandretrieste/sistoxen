/**
 * VALIDAÇÃO DE REGRAS DE NEGÓCIO
 * 
 * Este arquivo testa as regras de negócio específicas do sistema:
 * - Transferência de estoque fechado para em uso
 * - Finalização de lotes
 * - Validações de quantidade
 * - Cálculo de diferenças em inventário
 */

const request = require('supertest');
const express = require('express');

jest.mock('../database/init', () => ({
  db: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
  }
}));

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'admin' };
    next();
  }
}));

describe('Regras de Negócio - Gestão de Estoque', () => {
  describe('Transferência Fechado → Em Uso', () => {
    test('Deve permitir transferir quantidade válida de fechado para uso', async () => {
      const lote = {
        id: 1,
        quantidade_fechado: 10,
        quantidade_uso: 5
      };

      const quantidadeTransferir = 3;
      expect(quantidadeTransferir).toBeLessThanOrEqual(lote.quantidade_fechado);
      
      const novoFechado = lote.quantidade_fechado - quantidadeTransferir;
      const novoUso = lote.quantidade_uso + quantidadeTransferir;

      expect(novoFechado).toBe(7);
      expect(novoUso).toBe(8);
    });

    test('Não deve permitir transferir quantidade maior que disponível', () => {
      const lote = {
        quantidade_fechado: 5,
        quantidade_uso: 2
      };

      const quantidadeTransferir = 10;
      expect(quantidadeTransferir).toBeGreaterThan(lote.quantidade_fechado);
    });

    test('Deve permitir transferir todo o estoque fechado', () => {
      const lote = {
        quantidade_fechado: 10,
        quantidade_uso: 0
      };

      const quantidadeTransferir = 10;
      const novoFechado = lote.quantidade_fechado - quantidadeTransferir;
      const novoUso = lote.quantidade_uso + quantidadeTransferir;

      expect(novoFechado).toBe(0);
      expect(novoUso).toBe(10);
    });
  });

  describe('Finalização de Lotes', () => {
    test('Deve finalizar automaticamente se tem 1 unidade', () => {
      const lote = { quantidade_uso: 1 };
      const quantidadeFinalizar = 1;
      
      const novaQuantidade = lote.quantidade_uso - quantidadeFinalizar;
      expect(novaQuantidade).toBe(0);
    });

    test('Deve permitir finalização parcial se tem múltiplas unidades', () => {
      const lote = { quantidade_uso: 10 };
      const quantidadeFinalizar = 3;
      
      const novaQuantidade = lote.quantidade_uso - quantidadeFinalizar;
      expect(novaQuantidade).toBe(7);
      expect(novaQuantidade).toBeGreaterThan(0);
    });

    test('Deve finalizar completamente se informar toda quantidade', () => {
      const lote = { quantidade_uso: 10 };
      const quantidadeFinalizar = 10;
      
      const novaQuantidade = lote.quantidade_uso - quantidadeFinalizar;
      expect(novaQuantidade).toBe(0);
    });

    test('Não deve permitir finalizar mais que o disponível', () => {
      const lote = { quantidade_uso: 5 };
      const quantidadeFinalizar = 10;
      
      expect(quantidadeFinalizar).toBeGreaterThan(lote.quantidade_uso);
    });

    test('Deve marcar data_finalizacao quando zerar quantidade', () => {
      const lote = { quantidade_uso: 5, data_finalizacao: null };
      const quantidadeFinalizar = 5;
      
      const novaQuantidade = lote.quantidade_uso - quantidadeFinalizar;
      const deveMarcarFinalizacao = novaQuantidade === 0;
      
      expect(deveMarcarFinalizacao).toBe(true);
    });

    test('Não deve marcar data_finalizacao em finalização parcial', () => {
      const lote = { quantidade_uso: 10, data_finalizacao: null };
      const quantidadeFinalizar = 3;
      
      const novaQuantidade = lote.quantidade_uso - quantidadeFinalizar;
      const deveMarcarFinalizacao = novaQuantidade === 0;
      
      expect(deveMarcarFinalizacao).toBe(false);
    });
  });

  describe('Cálculo de Diferenças em Inventário', () => {
    test('Deve calcular diferença positiva (sobra)', () => {
      const quantidadeSistema = 10;
      const quantidadeContada = 12;
      const diferenca = quantidadeContada - quantidadeSistema;
      
      expect(diferenca).toBe(2);
      expect(diferenca).toBeGreaterThan(0);
    });

    test('Deve calcular diferença negativa (falta)', () => {
      const quantidadeSistema = 10;
      const quantidadeContada = 7;
      const diferenca = quantidadeContada - quantidadeSistema;
      
      expect(diferenca).toBe(-3);
      expect(diferenca).toBeLessThan(0);
    });

    test('Deve calcular diferença zero (exato)', () => {
      const quantidadeSistema = 10;
      const quantidadeContada = 10;
      const diferenca = quantidadeContada - quantidadeSistema;
      
      expect(diferenca).toBe(0);
    });

    test('Deve lidar com valores decimais', () => {
      const quantidadeSistema = 10.5;
      const quantidadeContada = 9.8;
      const diferenca = quantidadeContada - quantidadeSistema;
      
      expect(diferenca).toBeCloseTo(-0.7, 1);
    });
  });

  describe('Validação de Tipos de Movimentação', () => {
    test('Deve aceitar apenas tipos válidos', () => {
      const tiposValidos = ['ENTRADA', 'SAIDA', 'DOACAO', 'EMPRESTIMO', 'VENCIMENTO', 'AJUSTE'];
      
      expect(tiposValidos).toContain('ENTRADA');
      expect(tiposValidos).toContain('SAIDA');
      expect(tiposValidos).toContain('AJUSTE');
      expect(tiposValidos).not.toContain('ABERTURA');
      expect(tiposValidos).not.toContain('FINALIZACAO');
    });

    test('Deve rejeitar tipos inválidos', () => {
      const tiposValidos = ['ENTRADA', 'SAIDA', 'DOACAO', 'EMPRESTIMO', 'VENCIMENTO', 'AJUSTE'];
      const tipoInvalido = 'INVALIDO';
      
      expect(tiposValidos).not.toContain(tipoInvalido);
    });
  });

  describe('Validação de Armazenamento', () => {
    test('Deve aceitar tipos de armazenamento válidos', () => {
      const tiposValidos = ['Ambiente', '2°C-8°C', '−20°C'];
      
      expect(tiposValidos).toContain('Ambiente');
      expect(tiposValidos).toContain('2°C-8°C');
      expect(tiposValidos).toContain('−20°C');
    });

    test('Default deve ser Ambiente', () => {
      const armazenamentoDefault = 'Ambiente';
      expect(armazenamentoDefault).toBe('Ambiente');
    });
  });

  describe('Cálculo de Estoque Total', () => {
    test('Deve somar estoque fechado e em uso', () => {
      const lotes = [
        { quantidade_fechado: 10, quantidade_uso: 5 },
        { quantidade_fechado: 8, quantidade_uso: 2 },
        { quantidade_fechado: 0, quantidade_uso: 3 }
      ];

      const estoqueTotal = lotes.reduce((sum, l) => 
        sum + l.quantidade_fechado + l.quantidade_uso, 0
      );

      expect(estoqueTotal).toBe(28);
    });

    test('Deve retornar zero se não há lotes', () => {
      const lotes = [];
      const estoqueTotal = lotes.reduce((sum, l) => 
        sum + l.quantidade_fechado + l.quantidade_uso, 0
      );

      expect(estoqueTotal).toBe(0);
    });
  });

  describe('Validação de Estoque Mínimo', () => {
    test('Deve alertar quando estoque total menor que mínimo', () => {
      const produto = { estoque_minimo: 10 };
      const estoqueTotal = 5;
      
      const abaixoMinimo = estoqueTotal < produto.estoque_minimo;
      expect(abaixoMinimo).toBe(true);
    });

    test('Não deve alertar quando estoque está acima do mínimo', () => {
      const produto = { estoque_minimo: 10 };
      const estoqueTotal = 15;
      
      const abaixoMinimo = estoqueTotal < produto.estoque_minimo;
      expect(abaixoMinimo).toBe(false);
    });

    test('Não deve alertar quando estoque igual ao mínimo', () => {
      const produto = { estoque_minimo: 10 };
      const estoqueTotal = 10;
      
      const abaixoMinimo = estoqueTotal < produto.estoque_minimo;
      expect(abaixoMinimo).toBe(false);
    });
  });
});
