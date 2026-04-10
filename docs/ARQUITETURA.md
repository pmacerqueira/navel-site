# Arquitetura — navel-site (e separação de contexto)

Este documento define a arquitetura do `navel-site` e evita mistura de decisões com outros projetos.

---

## 1) Escopo deste projeto

`navel-site` é o website institucional da Navel:
- frontend React (SPA estática em cPanel);
- rotas com URL limpa (`/contacto`, `/condicoes-gerais`, …) e fallback Apache em `.htaccess`;
- foco em conteúdo, SEO, formulários, páginas legais (privacidade, RGPD, CGVS) e área reservada.

---

## 2) Stack e componentes

- **Frontend:** React 18 + Vite
- **Router:** BrowserRouter (URLs limpas; ver secção 3)
- **Deploy:** cPanel (ficheiros estáticos + `send-contact.php`)
- **Área reservada / documentos:** Supabase (Auth + Storage)

---

## 3) Decisões principais

### BrowserRouter + `.htaccess`
URLs limpas para SEO; o servidor entrega `index.html` para paths da SPA. Redirecção **www → navel.pt** e HTTPS no mesmo `.htaccess`.

### Supabase para área reservada
Escolhido para simplificar auth/storage no contexto do site institucional.

---

## 4) Separação com AT_Manut (muito importante)

Não misturar decisões entre projetos:

- **navel-site:** Supabase para área reservada/documentos.
- **AT_Manut:** MySQL + PHP no cPanel como fonte de verdade, com modo offline-first.

Regra prática:
- se a tarefa for do website institucional, pensar em contexto `navel-site`;
- se for da app operacional de manutenção, pensar em contexto `AT_Manut`.

---

## 5) Limites e responsabilidades

- Este projeto não é sistema transacional de operações de manutenção.
- Não replicar aqui regras de sync offline, filas ou ADRs específicos do AT_Manut.
- Para deploy e operação ver `DEPLOY.md`.

