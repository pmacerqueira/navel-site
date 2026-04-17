# Setup — navel-site

Guia rápido para preparar ambiente local sem perda de tempo.

---

## 1) Pré-requisitos

- Node.js 18+ e npm
- Git
- Projeto Supabase (se for usar área reservada)

---

## 2) Instalação

```bash
git clone https://github.com/pmacerqueira/navel-site.git
cd navel-site
npm install
```

---

## 3) Variáveis de ambiente

Copiar `.env.example` para `.env` e preencher:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

> Nunca guardar credenciais reais em ficheiros `.txt` dentro do projeto.

---

## 4) Executar localmente

```bash
npm run dev
```

URL local: `http://localhost:3000`

---

## 5) Build e validação

```bash
npm run build
npm run preview
```

Para publicação no cPanel:
- **Automatizado (preferido):** `npm run deploy:all -- --yes` após `npm run build`.
  Setup único em **`docs/DEPLOY-AUTOMATICO-CPANEL.md`** (`.env.cpanel` + conta FTP dedicada).
- **Manual:** `OPTIMIZAR.bat` → upload do ZIP no File Manager.

---

## 6) Setup do deploy automático (opcional, uma vez)

Se quiseres usar o `npm run deploy:*` em vez do File Manager manual:

1. Seguir **`docs/DEPLOY-AUTOMATICO-CPANEL.md`**:
   - Criar conta FTP dedicada em cPanel → FTP Accounts (ex.: `deploy@navel.pt`,
     restrita a `/public_html`)
   - Copiar `.env.cpanel.example` → `.env.cpanel` e preencher
2. Testar com `npm run deploy:probe` (não escreve nada).
3. Primeiro deploy: `npm run deploy:dry` → `npm run deploy:all -- --yes`.

---

## 7) Problemas comuns

- **Erro de módulo/dependência:** correr `npm install`.
- **Falha Supabase:** rever `docs/SUPABASE.md` e variáveis no `.env`.
- **Assets em falta:** confirmar pipeline de otimização e paths em `public/images/`.
- **Deploy automático falha:** ver troubleshooting em
  `docs/DEPLOY-AUTOMATICO-CPANEL.md`.

