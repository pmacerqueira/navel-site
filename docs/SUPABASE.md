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

### Registo mostra "Database error saving new user"

Esta mensagem vem do **Auth** quando o trigger `on_auth_user_created` falha ao inserir na tabela `public.profiles` (não é um bug do formulário do site).

1. No Supabase: **Logs** → **Postgres** ou **Auth** e procure a linha do erro. Se aparecer **`relation "profiles" does not exist`**, o passo 3 (executar `docs/supabase-setup.sql` neste projeto) ainda não foi aplicado ou falhou a meio — volte a correr o ficheiro completo no **SQL Editor**. Outros exemplos: `permission denied for table profiles`, erros de sintaxe no trigger.
2. No **SQL Editor**, execute **`docs/supabase-fix-signup-database-error.sql`** (recria `public.handle_new_user()` com `SECURITY DEFINER` e `SET search_path = public`, e volta a ligar o trigger).
3. Confirme que a tabela `profiles` existe e que o SQL de setup foi aplicado ao projeto certo.

Se o email já existir em **Authentication → Users**, apague o utilizador de teste ou use outro email antes de voltar a registar.

### Admin: lista de pendentes vazia (mas há linhas em `profiles`)

As políticas antigas consultavam `auth.users` dentro do RLS; com o cliente autenticado isso não devolve o email do admin, por isso a página **Admin** não mostrava ninguém. Execute **`docs/supabase-fix-admin-pending-list-rls.sql`** no SQL Editor (ou volte a aplicar o bloco RLS de `docs/supabase-setup.sql` actualizado).

### Erro ao ler perfil: `permission denied for table users`

Uma política em **`public.profiles`** (quase sempre **«Admin can read all»** antiga) ainda faz **subconsulta a `auth.users`**. O cliente autenticado **não pode** ler essa tabela, e o Postgres **falha o `SELECT` em `profiles` por completo** — nem o utilizador consegue ler a própria linha.

Execute no **SQL Editor**: **`docs/supabase-fix-profiles-rls-permission-denied-users.sql`** (recria políticas de admin com JWT e a política «ler o próprio perfil», e actualiza `is_admin_documentos()` sem `auth.users`).

### Aprovado no Table Editor mas o site continua a pedir aprovação

1. **Mesmo projecto Supabase que o site** — o `navel.pt` usa as chaves **gravadas no build** (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` no `.env` da máquina onde corres `npm run build`). Se editares outro projecto no dashboard, o site não vê essa alteração. Confirma o **Project URL** em **Settings → API** com o que está no build.

2. **`profiles.id` = `auth.users.id`** — a linha que editaste tem de ser a do **mesmo UUID** que o utilizador em **Authentication → Users**. No **SQL Editor**:

```sql
SELECT au.id AS auth_user_id, au.email AS auth_email,
       p.id AS profile_id, p.email AS profile_email, p.approved
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email ILIKE 'pmedeiros@navel.pt';
```

Se `profile_id` for `NULL`, falta linha em `profiles` (ou `id` não coincide). Se `approved` for `false` nesta linha, o site está a ler o estado correcto.

3. Depois de corrigir na BD, no site usa **«Atualizar estado»** na página de espera ou volta a entrar.

### Email ao admin quando há pedido pendente

O Auth **só** envia confirmação ao **novo** utilizador; **não** envia aviso ao `comercial@navel.pt`. Com sessão de admin, o site mostra um **contador no link “Admin”** no cabeçalho quando há pedidos pendentes (não depende do contrato Microsoft). Para **email** opcional, vê **`docs/supabase-notify-admin-pending-user.md`** (webhook + Power Automate ou alternativas).

## 4. Ativar verificação de email

1. **Authentication** → **Providers** → **Email**
2. Ative **Confirm email**
3. (Opcional) Personalize o template do email em **Email Templates**

### Redirect URLs (produção e dev)

Em **Authentication** → **URL Configuration**:

- **Site URL:** `https://navel.pt`
- **Redirect URLs:** inclua pelo menos `https://navel.pt/login` e, para desenvolvimento local, `http://localhost:3000/login`

(O registo usa `emailRedirectTo` para `/login`; sem estas entradas, a confirmação por email pode falhar.)

## 5. Bucket de documentos

O ficheiro `docs/supabase-setup.sql` já inclui a criação do bucket `documentos` e as políticas de acesso. Execute o SQL completo (passo 3) e o bucket será criado automaticamente.

**Portal de documentos (área reservada):** para que utilizadores autenticados possam **carregar** ficheiros e apenas o admin (`comercial@navel.pt`, via `is_admin_documentos()`) possa **atualizar/apagar**, execute no SQL Editor também **`docs/supabase-storage-portal-policies.sql`** depois de o bucket `documentos` existir (ou confirme que o `supabase-setup.sql` que aplicou já incorpora essas políticas).

**Alternativa:** Se o bucket não existir, o admin pode clicar em **Criar bucket** na área reservada (o Supabase pode exigir que o bucket seja criado via SQL/dashboard consoante as permissões).

## 6. Upload de documentos

1. **Storage** → `documentos` → **Upload file**
2. Envie PDFs, etc. (catálogos, tabelas de preços, manuais)

## 7. Criar o administrador

**Opção A — Script (recomendado):**

1. Em `.env`, adicione `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → service_role)
2. Execute: `npm run create-admin`
3. Guarde a password gerada — use-a para login em `/login` (ex.: `https://navel.pt/login`)

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

- Login: `/login`
- Registo: `/registar`
- Área reservada: `/area-reservada`
- Admin: `/admin` (apenas comercial@navel.pt)

## 8. Keep-alive (plano gratuito — evitar pausa por inactividade)

O Supabase pode **pausar** projectos free-tier após cerca de **7 dias sem actividade** suficiente na API/base de dados.

### No Supabase (uma vez)

1. **SQL Editor** → executar o conteúdo de **`docs/supabase-keep-alive-rpc.sql`** (tabela `supabase_keepalive_heartbeats` + função `keep_alive_ping` com `UPDATE` real).
2. Se já tinha a versão antiga (só `SELECT 1`), volte a executar o ficheiro completo para criar a tabela e substituir a função.

### No servidor (navel.pt)

1. Colocar **`keep-alive-supabase.php`** na raiz do site (já está em `public/` do projecto; sobe com cada deploy).
2. **Não commitar chaves.** Criar `public/keep-alive-supabase.secret.php` **só no servidor** (ou variáveis de ambiente no cron), por exemplo:

```php
<?php
return [
  'url' => 'https://kgvbvgwqkqkfccraaehb.supabase.co',
  'anon_key' => 'cole aqui a chave anon de Settings → API',
];
```

3. **Cron recomendado** (2× por dia, via HTTP — não depende do `php.ini` do CLI):

```text
0 6,18 * * * curl -fsS -m 45 "https://navel.pt/keep-alive-supabase.php" >> /home/UTILIZADOR/logs/supabase-keepalive.log 2>&1
```

4. Testar no browser: `https://navel.pt/keep-alive-supabase.php` — deve responder `OK - ... rpc(keep_alive_ping)... auth/health HTTP 200`.

5. **`?verbose=1`** — inclui mais detalhe na resposta em caso de falha.

O script faz: **RPC** (Postgres) + **GET /auth/v1/health** (GoTrue). Se a segunda falhar mas a RPC funcionar, o script ainda sai com código 0 e marca `OK_RPC` com aviso.

### Segurança

Se alguma chave anon chegou a estar em ficheiros versionados, **rode a chave** em Supabase → **Settings** → **API** → **Reset** / nova chave anon e actualize `.env`, o `secret.php` no servidor e o build do frontend.
