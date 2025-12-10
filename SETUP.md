# 🚀 Setup Rápido - SistoXen

## 1️⃣ Instalar dependências

```powershell
npm install
```

## 2️⃣ Criar projeto no Supabase

1. Acesse https://supabase.com
2. Faça login/cadastro
3. Clique em **"New Project"**
4. Preencha nome, senha do DB e região
5. Aguarde ~2 minutos até criar

## 3️⃣ Executar Schema SQL

1. No Supabase, vá em **SQL Editor** (ícone de banco na lateral)
2. Clique em **"New Query"**
3. Abra o arquivo `database/schema.sql` deste projeto
4. Copie **todo** o conteúdo
5. Cole no editor do Supabase
6. Clique em **"Run"** ou pressione `Ctrl + Enter`
7. Aguarde mensagem de sucesso ✅

## 4️⃣ Copiar credenciais

1. No Supabase, vá em **Settings** > **API**
2. Copie:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **Project API keys** → **anon/public** (chave longa começando com `eyJ...`)

## 5️⃣ Configurar `.env`

1. Copie o arquivo `.env.example` e renomeie para `.env`
2. Preencha com as credenciais:

```env
# Supabase (cole aqui o que copiou)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MailSender (preencha com suas credenciais SMTP)
SMTP_HOST=smtp.mailsender.com
SMTP_PORT=587
SMTP_USER=seu-email@dominio.com
SMTP_PASS=sua-senha
SMTP_FROM="SistoXen <seu-email@dominio.com>"
```

⚠️ **Importante:** Use a chave **anon/public**, NÃO a `service_role`!

## 6️⃣ Iniciar servidor

```powershell
npm start
```

Acesse: http://localhost:3000

## 7️⃣ Fazer login

- **Usuário:** `admin`
- **Senha:** `admin123`

---

## ✅ Pronto!

Agora você pode:
- Cadastrar produtos
- Criar lotes
- Fazer movimentações
- Realizar inventários
- Recuperar senha por email

---

## 🆘 Problemas?

### "SUPABASE_URL is not defined"
➡️ Certifique-se que o arquivo `.env` existe e está preenchido corretamente

### "relation 'usuarios' does not exist"
➡️ Execute o `database/schema.sql` no SQL Editor do Supabase

### "Email não está sendo enviado"
➡️ Verifique:
- `SMTP_USE_ETHEREAL=false`
- `SMTP_PASS` preenchido
- Credenciais corretas do MailSender

### "Invalid API key"
➡️ Use a chave **anon/public**, não a `service_role`
