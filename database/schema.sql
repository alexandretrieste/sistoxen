-- Execute este script no SQL Editor do Supabase
-- https://supabase.com/dashboard/project/_/sql

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  ativo INTEGER DEFAULT 1,
  is_admin INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  descricao TEXT NOT NULL,
  tipo_unidade TEXT NOT NULL,
  fabricante TEXT,
  cmm REAL DEFAULT 0,
  estoque_minimo REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de lotes
CREATE TABLE IF NOT EXISTS lotes (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  numero_lote TEXT NOT NULL,
  quantidade_inicial REAL NOT NULL,
  quantidade_fechado REAL NOT NULL,
  quantidade_uso REAL NOT NULL,
  data_validade DATE NOT NULL,
  data_abertura DATE,
  data_finalizacao DATE,
  data_solicitacao DATE,
  justificativa_abertura TEXT,
  observacoes TEXT,
  fabricante TEXT,
  aberto INTEGER DEFAULT 0,
  tipo_armazenamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produto_id, numero_lote)
);

-- Tabela de movimentações
CREATE TABLE IF NOT EXISTS movimentacoes (
  id SERIAL PRIMARY KEY,
  lote_id INTEGER NOT NULL REFERENCES lotes(id),
  tipo TEXT NOT NULL,
  quantidade REAL NOT NULL,
  motivo TEXT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  data_movimentacao TIMESTAMPTZ DEFAULT NOW(),
  observacoes TEXT
);

-- Tabela de inventários
CREATE TABLE IF NOT EXISTS inventarios (
  id SERIAL PRIMARY KEY,
  data_inventario TIMESTAMPTZ DEFAULT NOW(),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  observacoes TEXT,
  finalizado INTEGER DEFAULT 0
);

-- Tabela de tokens de redefinição de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  ip TEXT
);

-- Tabela de itens do inventário
CREATE TABLE IF NOT EXISTS inventario_itens (
  id SERIAL PRIMARY KEY,
  inventario_id INTEGER NOT NULL REFERENCES inventarios(id),
  lote_id INTEGER NOT NULL REFERENCES lotes(id),
  quantidade_sistema REAL NOT NULL,
  quantidade_contada REAL,
  diferenca REAL,
  observacoes TEXT
);

-- Usuário admin padrão (senha: admin123)
INSERT INTO usuarios (username, password, nome, is_admin)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrador', 1)
ON CONFLICT (username) DO NOTHING;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lotes_produto ON lotes(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lote ON movimentacoes(lote_id);
CREATE INDEX IF NOT EXISTS idx_inventario_itens_inventario ON inventario_itens(inventario_id);
CREATE INDEX IF NOT EXISTS idx_inventario_itens_lote ON inventario_itens(lote_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
