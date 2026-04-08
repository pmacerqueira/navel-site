# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Navel - Açores corporate website: React 18 + Vite 5 SPA with i18next (PT/EN/ES) and hash routing. See `README.md` for commands and `docs/INDEX.md` for full documentation map.

### Running the dev server

```
npm run dev
```

Starts Vite on `http://localhost:3000` (configurable in `vite.config.js`). The `server.open` option auto-opens a browser tab — in headless environments this can be ignored.

### Building

```
npm run build
```

Output goes to `dist/`. No lint step exists — the Vite build is the primary code validation.

### No lint or test framework

This project has no ESLint, Prettier, or automated test suite configured. `npm run build` is the closest equivalent to a lint/type check.

### Supabase (optional)

Supabase powers the reserved area (login, registration, admin, document storage). It is **not required** for public pages — the Supabase client gracefully returns `null` if env vars are missing. To enable it, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (copy from `.env.example`).

### .env file

Must be created from `.env.example` before first run. Without it the dev server still starts; Supabase features simply degrade gracefully with a console warning.

### Key file locations

- Brand data: `src/data/brands.js`
- Translations: `src/locales/pt.json`, `en.json`, `es.json`
- SEO: `index.html` + `src/components/PageTitle.jsx`
- Vite config: `vite.config.js`
- Deploy docs: `DEPLOY.md`
