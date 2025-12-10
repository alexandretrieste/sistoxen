# SistoXen - Sistema de Gestão de Estoque

Sistema completo de gestão de lotes, produtos e inventário com recuperação de senha via email.

## 🚀 Stack

- **Backend**: Node.js + Express
- **Banco**: Supabase (PostgreSQL)
- **Email**: SMTP (MailSender ou similar)
- **Auth**: JWT + bcrypt
- **Frontend**: Vanilla JavaScript

## 📋 Setup Rápido

### 1. Instalar dependências

```powershell
npm install
```

### 2. Configurar Supabase

1. Crie conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. No **SQL Editor**, execute:

```sql
-- Tabela de usuários
CREATE TABLE usuarios (
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
CREATE TABLE produtos (
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
CREATE TABLE lotes (
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
CREATE TABLE movimentacoes (
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
CREATE TABLE inventarios (
  id SERIAL PRIMARY KEY,
  data_inventario TIMESTAMPTZ DEFAULT NOW(),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  observacoes TEXT,
  finalizado INTEGER DEFAULT 0
);

-- Tabela de tokens de reset
CREATE TABLE password_reset_tokens (
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
CREATE TABLE inventario_itens (
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
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrador', 1);

-- Índices
CREATE INDEX idx_lotes_produto ON lotes(produto_id);
CREATE INDEX idx_movimentacoes_lote ON movimentacoes(lote_id);
CREATE INDEX idx_inventario_itens_inventario ON inventario_itens(inventario_id);
CREATE INDEX idx_inventario_itens_lote ON inventario_itens(lote_id);
```

4. Copie **Project URL** e **anon key** (Settings > API)

### 3. Configurar `.env`

Copie `.env.example` para `.env` e preencha:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=sua-anon-key-aqui

# MailSender
SMTP_HOST=smtp.mailsender.com
SMTP_PORT=587
SMTP_USER=seu-email@dominio.com
SMTP_PASS=sua-senha
SMTP_FROM="SistoXen <seu-email@dominio.com>"
```

### 4. Iniciar servidor

```powershell
npm start
```

Acesse: http://localhost:3000

**Login padrão:**
- Usuário: `admin`
- Senha: `admin123`

## 🔧 Configuração de Email

### MailSender

No `.env`:
```env
SMTP_USE_ETHEREAL=false
SMTP_HOST=smtp.mailsender.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Outro provedor

Ajuste conforme documentação do provedor:
- Porta 587: `SMTP_SECURE=false` (STARTTLS)
- Porta 465: `SMTP_SECURE=true` (SSL/TLS)

## 📦 Funcionalidades

- ✅ Gestão de produtos, lotes e movimentações
- ✅ Inventário com contagem e diferenças
- ✅ Controle de acesso (admin/usuário)
- ✅ Recuperação de senha via email
- ✅ Rastreamento de abertura de lotes
- ✅ Histórico completo de movimentações

## 🛠️ Tecnologias

- Node.js 22+
- Express.js
- Supabase (PostgreSQL)
- JWT Authentication
- bcryptjs
- nodemailer

## 📄 Licença

MIT
