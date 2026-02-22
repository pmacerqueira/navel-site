# Configuração Supabase — Área reservada

A área reservada usa **Supabase** para autenticação e armazenamento de documentos. Siga estes passos para configurar.

## 1. Criar projeto Supabase

1. Aceda a [supabase.com](https://supabase.com) e crie uma conta (gratuita)
2. **New Project** → nome (ex: `navel`), região, password da base de dados
3. Aguarde o projeto ser criado

## 2. Configurar variáveis de ambiente

1. No painel Supabase: **Settings** → **API**
2. Copie **Project URL** e **anon public** key
3. Na pasta do projeto, crie o ficheiro `.env`:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

4. Reinicie o servidor de desenvolvimento (`npm run dev`)

## 3. Criar tabela e trigger

No Supabase: **SQL Editor** → **New query** → cole o conteúdo de **`docs/supabase-setup.sql`** (ou execute esse ficheiro) e clique em **Run**.

O ficheiro `docs/supabase-setup.sql` inclui:
- Tabela `profiles` com aprovação manual
- Trigger que cria perfil automaticamente e **aprova logo o comercial@navel.pt**
- Políticas RLS

## 4. Ativar verificação de email

1. **Authentication** → **Providers** → **Email**
2. Ative **Confirm email**
3. (Opcional) Personalize o template do email em **Email Templates**

## 5. Bucket de documentos

O ficheiro `docs/supabase-setup.sql` já inclui a criação do bucket `documentos` e as políticas de acesso. Execute o SQL completo (passo 3) e o bucket será criado automaticamente.

**Alternativa:** Se o bucket não existir, o admin pode clicar em **Criar bucket** na área reservada (o Supabase pode exigir que o bucket seja criado via SQL/dashboard consoante as permissões).

## 6. Upload de documentos

1. **Storage** → `documentos` → **Upload file**
2. Envie PDFs, etc. (catálogos, tabelas de preços, manuais)

## 7. Criar o administrador

**Opção A — Script (recomendado):**

1. Em `.env`, adicione `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → service_role)
2. Execute: `npm run create-admin`
3. Guarde a password gerada — use-a para login em `/#/login`

**Opção B — Supabase Dashboard:**

1. **Authentication** → **Users** → **Add user**
2. Email: `comercial@navel.pt`
3. Password: escolha uma palavra-passe segura
4. **Create user**
5. O trigger aprova-o automaticamente — pode entrar no site imediatamente

**Opção C — Registo pelo site:**

1. Aceda ao site → **Registar** (requer verificação de email)
2. Registe-se com `comercial@navel.pt`
3. Verifique o email
4. O trigger aprova-o automaticamente — faça login

## Resumo do fluxo

| Utilizador | Registo → Verifica email → Aguarda aprovação → Admin aprova → Login → Área reservada |
| Admin      | Criado no Dashboard ou Registo → **Aprovado automaticamente** → Login → Área reservada + Admin |

## URLs

- Login: `/#/login`
- Registo: `/#/registar`
- Área reservada: `/#/area-reservada`
- Admin: `/#/admin` (apenas comercial@navel.pt)
