# Notificar o admin por email — novo pedido de área reservada

**Sem Power Automate nem gestor M365:** com sessão de `comercial@navel.pt`, o site mostra um **número no menu “Admin”** quando existem perfis com `approved = false` (actualização ao entrar, ao voltar ao separador do browser e após aprovar na página Admin).

O registo cria uma linha em `public.profiles` com `approved = false`. O **Supabase Auth** só envia email de **confirmação de conta** ao **novo utilizador**; **não** existe email automático para `comercial@navel.pt` até configurares algo à parte.

Esta guia usa **Database Webhook** (Supabase) + **Microsoft Power Automate**. O email de notificação sai pelo **Outlook / Office 365** ligado ao fluxo — **não** precisas de configurar SMTP no Supabase só para esta notificação.

> **SMTP no Supabase** (Authentication → Emails → SMTP Settings) continua a ser só para mails **do Auth** (confirmar registo, recuperar password, etc.). Podes manter o que já tens ou `istobal@bot.navel.pt` aí também, se quiseres; é independente desta notificação ao admin.

### Licenciamento do Power Automate

**Não há uma resposta única:** depende do **plano Microsoft 365** da organização e do que a Microsoft classifica como conector “standard” vs “premium” na vossa data.

- Muitos planos M365 incluem **capacidade limitada** de fluxos na cloud, mas o trigger **“Quando é recebido um pedido HTTP”** (pedido HTTP recebido) **pode** contar como **premium** nalguns tenants — nesse caso pode ser necessário **Power Automate per user**, **per flow**, ou equivalente incluído no vosso acordo (ex.: E5 / add-on). O próprio editor costuma mostrar ícone **“premium”** (diamante) nos passos que o exigem.
- **Antes de assumir que é “grátis com o Office”:** cria um fluxo de teste só com HTTP + Outlook; se o Power Automate pedir licença ou bloquear ao guardar, o vosso **IT / administrador Microsoft** confirma o que já está pago no contrato.

**Se não quiserem depender do licenciamento do Power Automate:**

- **Make (Integromat)** / **Zapier** — webhook gratuito com limites; depois módulo de email.
- **Supabase Edge Function** — recebe o webhook (ou é chamada por Database Webhook apontando para a função) e envia email via **Microsoft Graph** (registo de aplicação em Azure AD) ou via API de um serviço tipo Resend — mais trabalho de uma vez, sem subscrição Power Automate.
- **Endpoint vosso** (ex.: script no servidor onde já hospedam o site) que recebe o POST do webhook e envia correio com credenciais que já tenham — só se for aceitável em termos de segurança e manutenção.

---

## 1. Power Automate — fluxo “HTTP → Email”

1. Acede a [Power Automate](https://make.powerautomate.com) com uma conta **navel.pt** (ex.: `comercial@navel.pt`).
2. **Criar** → **Fluxo instantâneo** (ou “Automated cloud flow”) com o trigger **Quando é recebido um pedido HTTP** (“When an HTTP request is received”).
3. No passo HTTP:
   - Opcional: em **Esquema JSON do pedido**, podes colar um esquema mínimo para o designer (não é obrigatório para funcionar):

```json
{
  "type": "object",
  "properties": {
    "type": { "type": "string" },
    "table": { "type": "string" },
    "record": {
      "type": "object",
      "properties": {
        "email": { "type": "string" },
        "approved": { "type": "boolean" },
        "id": { "type": "string" }
      }
    }
  }
}
```

4. **Novo passo** → **Controlo** → **Condição**  
   - Campo: `body('Parse_JSON')?['record']?['approved']` **é igual a** `false`  
   - Se não usaste “Parse JSON”, usa **Expressão** no primeiro campo da condição, por exemplo:  
     `equals(triggerBody()?['record']?['approved'], false)`  
   (No designer: adiciona passo **Analisar JSON** com o conteúdo `triggerBody()` se preferires variáveis nomeadas.)

5. No ramo **Se sim**, adiciona **Office 365 Outlook** → **Enviar um email (V2)** (ou “Send an email”):
   - **Para:** `comercial@navel.pt`
   - **Assunto:** exemplo: `Área reservada — novo pedido: @{triggerBody()?['record']?['email']}`
   - **Corpo:** texto com o email do pedido, data, e link para `https://navel.pt/admin` (ou o URL do vosso site).

6. **Guardar**. Copia o **URL HTTP POST** do trigger (só aparece depois de guardar uma primeira vez).

7. (Recomendado) No mesmo trigger HTTP, em **Configurações avançadas**, define um **segredo** ou usa o URL que já inclui token — não partilhes o URL publicamente.

---

## 2. Supabase — Database Webhook

1. Dashboard do projecto → **Integrations** (ou **Database**) → **Webhooks**  
   [Abrir Webhooks](https://supabase.com/dashboard/project/_/database/hooks) — o caminho exacto pode ser **Database → Webhooks** consoante a versão do painel.
2. **Create a new hook** / **New webhook**
3. Configuração sugerida:
   - **Name:** `notify-admin-pending-profile`
   - **Table:** `profiles`
   - **Events:** `INSERT` apenas
   - **Type:** HTTP Request
   - **Method:** POST
   - **URL:** cola o URL do Power Automate
   - **HTTP Headers:** se o Automate suportar, adiciona validação (ex.: header `X-Webhook-Secret` com um valor aleatório longo; no fluxo, condição extra só se o header coincidir — depende do trigger HTTP do Automate aceitar headers custom; em alternativa, segredo no query string do URL do Automate).

4. Guarda o webhook.

### Sobre filtros

O webhook dispara em **todos** os `INSERT` em `profiles`. O admin `comercial@navel.pt` recebe linha com `approved = true` à criação — **não** queres email nesse caso. Por isso a **condição no Power Automate** (`approved` é `false`) é importante.

Se no futuro quiseres notificar só na BD, podes substituir o webhook por um trigger SQL com `WHEN (NEW.approved IS FALSE)` que chama `supabase_functions.http_request` — avançado; o fluxo acima costuma chegar.

---

## 3. Formato do payload (referência)

Em `INSERT`, o corpo é semelhante a:

```json
{
  "type": "INSERT",
  "table": "profiles",
  "schema": "public",
  "record": {
    "id": "uuid",
    "email": "utilizador@exemplo.pt",
    "approved": false,
    "created_at": "2026-04-15T18:53:06.915539+00:00"
  },
  "old_record": null
}
```

---

## Alternativa sem Power Automate

- **Make (Integromat)** ou **Zapier**: módulo Webhooks → Email, mesmo padrão (URL do webhook = URL que o Supabase chama).
- **Edge Function Supabase** + envio por API (Resend, etc.): mais código e chaves; só faz sentido se não quiseres Microsoft no meio.

---

## Resumo

| Quem recebe | O quê | Como |
|-------------|--------|------|
| Novo utilizador | Confirmar email | Auth / templates Supabase (já configurado) |
| `comercial@navel.pt` | “Há um pedido para aprovar” | Webhook `profiles` INSERT → Power Automate → condição `approved = false` → Outlook envia email |

Isto não substitui a página **Admin** do site; só avisa por email para abrires `/admin` e clicares **Aprovar**.
