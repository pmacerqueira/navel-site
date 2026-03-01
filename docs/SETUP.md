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

Para publicação padrão no cPanel, usar `OPTIMIZAR.bat`.

---

## 6) Problemas comuns

- **Erro de módulo/dependência:** correr `npm install`.
- **Falha Supabase:** rever `docs/SUPABASE.md` e variáveis no `.env`.
- **Assets em falta:** confirmar pipeline de otimização e paths em `public/images/`.

