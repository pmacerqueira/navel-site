# Responsividade — navel-site

> Guia de referência para desenvolvimento contínuo.
> Última revisão: 2026-02-22 (v0.2.0)

---

## 1. Sistema de breakpoints

| Nome | Valor | Uso típico |
|---|---|---|
| xs | `< 380px` | Telemóveis muito pequenos (Android económico, iPhone SE 1ª geração) |
| sm | `< 480px` | Telemóveis pequenos / médios |
| md | `< 640px` | Maioria dos smartphones em portrait |
| lg | `< 768px` | Smartphones grandes (iPhone Max, Galaxy Ultra) em portrait |
| tablet | `< 900px` | Tablets pequenos em portrait / smartphones em landscape |
| desktop-sm | `< 1024px` | Tablets grandes / laptops pequenos |
| desktop | `≥ 1025px` | Desktop / laptop padrão |

### Breakpoints de orientação

```css
/* Landscape em qualquer dispositivo mobile/tablet */
@media (max-width: 900px) and (orientation: landscape) { … }

/* Landscape em dispositivos com menu hamburger */
@media (max-width: 1024px) and (orientation: landscape) { … }
```

### Variável de header
```css
:root         { --header-h: 72px; }   /* desktop */
≤1024px       { --header-h: 56px; }   /* mobile/tablet */
```

---

## 2. Padrões responsivos aplicados

### 2.1 Layout de hero em landscape

**Problema:** Em portrait o hero usa `flex-direction: column` (texto em cima, animação em baixo). Em landscape mobile, o viewport é estreito em altura (~360–400px), tornando o hero demasiado longo.

**Solução aplicada** (`pages.css`):
```css
@media (max-width: 899px) and (orientation: landscape) {
  .hero__inner {
    flex-direction: row;    /* lado a lado em landscape */
    align-items: center;
  }
  .hero-animation {
    max-width: 180px;
  }
  .hero__actions {
    flex-direction: row;    /* botões em linha, não em coluna */
    width: auto;
  }
}
```

**Regra geral:** Qualquer secção que use `flex-direction: column` em mobile deve ter override para `row` em landscape quando os elementos couberam horizontalmente.

---

### 2.2 Botões flutuantes (WhatsApp + N)

**Posicionamento base:**
```
Desktop:   bottom: var(--space-lg)  / right: var(--space-lg)   → 56×56px
Mobile:    bottom: var(--space-md)  / right: var(--space-md)   → 40×40px
Landscape: bottom: var(--space-sm) / right: var(--space-sm)   → 36×36px
```

**Cálculo de stacking** (N acima do WhatsApp):
```css
/* Desktop */
.navel-dashboard-btn { bottom: calc(var(--space-lg) + 56px + 12px); }

/* Mobile ≤1024px */
.navel-dashboard-btn { bottom: calc(var(--space-md) + 40px + 10px); }

/* Landscape ≤900px */
.navel-dashboard-btn { bottom: calc(var(--space-sm) + 36px + 8px); }
```

**Regra:** Ao adicionar um terceiro botão flutuante, seguir o mesmo padrão de cálculo de `bottom` para evitar sobreposição.

**Tooltips:** Ocultar em `≤1024px` — sem estado hover real em dispositivos de toque:
```css
@media (max-width: 1024px) {
  .whatsapp-btn__tooltip,
  .navel-dashboard-btn__tooltip {
    display: none;
  }
}
```

---

### 2.3 Menu de navegação em landscape

**Problema:** Menu aberto em landscape mobile pode ultrapassar a altura do ecrã, cortando itens.

**Solução:**
```css
@media (max-width: 1024px) and (orientation: landscape) {
  .header__nav {
    max-height: calc(100vh - var(--header-total));
    max-height: calc(100dvh - var(--header-total));  /* dvh: dynamic viewport height */
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

**Nota:** Usar sempre `100dvh` (com `100vh` como fallback) para ter em conta a barra do browser em iOS Safari e Chrome Android.

---

### 2.4 Áreas de toque (Touch Targets)

**Mínimos obrigatórios:**
- WCAG 2.5.5: 44×44px
- Apple HIG: 44×44pt
- Google Material: 48×48dp

**Técnica com pseudo-elemento** (para não alterar o layout visual):
```css
.hero-animation__dot {
  width: 24px;
  height: 24px;
  position: relative;
}
.hero-animation__dot::after {
  content: '';
  position: absolute;
  inset: -10px;   /* expande a área de toque para ~44×44px */
}
```

**Regra:** Qualquer elemento interativo menor que 44px deve usar esta técnica em mobile.

---

### 2.5 Tipografia responsiva

**Padrão preferido — `clamp()`:**
```css
/* min, preferred, max */
font-size: clamp(1.4rem, 3.5vw, 2rem);
```

**Já implementado:**
```css
h1 { font-size: clamp(1.75rem, 4vw, 2.5rem); }
h2 { font-size: clamp(1.5rem, 3vw, 2rem); }
.hero__title { font-size: clamp(1.4rem, 3.5vw, 2rem); }
.browse-section__title { font-size: clamp(1.25rem, 2.5vw, 1.5rem); }
```

**Regra:** Títulos de secções e o corpo principal devem usar `clamp()`. Legendas e metadados podem usar valores fixos com override em `@media`.

---

### 2.6 Cookie consent

Em landscape, o cookie consent ocupa demasiado espaço vertical. Solução compacta:
```css
@media (max-width: 900px) and (orientation: landscape) {
  .cookie-consent {
    padding: var(--space-xs) var(--space-md);
  }
  .cookie-consent__inner {
    flex-wrap: nowrap;
  }
}
```

**Regra:** Qualquer banner/toast fixo no fundo deve ter versão compacta para landscape.

---

### 2.7 Grids responsivos

**Padrão recomendado:**
```css
/* 1 → 2 → 4 colunas */
.grid {
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 900px) {
  .grid { grid-template-columns: repeat(4, 1fr); }
}
```

**Padrão auto-fill (catálogos, marcas):**
```css
/* Adapta automaticamente — mas sempre definir fallback para mobile */
.catalogs-grid {
  grid-template-columns: 1fr;          /* mobile: 1 coluna */
}
@media (min-width: 480px) {
  .catalogs-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 768px) {
  .catalogs-grid { grid-template-columns: repeat(4, 1fr); }
}
```

**Atenção com `minmax()`:** `repeat(auto-fill, minmax(200px, 1fr))` numa secção de marcas (`brands-grid`) cria uma única coluna enorme em mobile. Adicionar sempre override:
```css
@media (max-width: 560px) {
  .brands-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

### 2.8 Inputs e formulários em mobile

**Regras:**
- `min-width` fixo em inputs **dentro de flex containers** causa overflow em mobile → sempre `min-width: 0`
- `word-break: break-all` é demasiado agressivo → usar `word-break: break-word; overflow-wrap: break-word`
- Padding de `var(--space-2xl)` em cards de autenticação → reduzir para `var(--space-lg)` em ≤640px

```css
@media (max-width: 480px) {
  .area-reservada__folder-input { min-width: 0; width: 100%; }
  .footer__newsletter-input { min-width: 0; }
}
@media (max-width: 640px) {
  .auth-card { padding: var(--space-lg); }
}
```

---

## 3. Checklist de revisão responsiva

Antes de cada build, verificar:

### Layout
- [ ] Testar em portrait e landscape em: 320px, 375px, 414px, 768px, 1024px
- [ ] Nenhum scroll horizontal em qualquer breakpoint
- [ ] Elementos com `position: fixed` não tapam conteúdo importante em landscape
- [ ] Menus com muitos itens têm scroll em landscape

### Toque e interacção
- [ ] Todos os botões/links têm pelo menos 44×44px de área de toque
- [ ] Tooltips ocultos em ≤1024px
- [ ] Formulários não têm `min-width` fixo em contextos flex

### Tipografia
- [ ] Títulos usam `clamp()` ou têm override em mobile
- [ ] Nenhum texto fica ilegível (< 0.7rem) em mobile

### Animações e media
- [ ] `@media (prefers-reduced-motion: reduce)` aplicado a animações
- [ ] Imagens têm `max-width: 100%` e `height: auto`

### Performance
- [ ] Imagens otimizadas com `npm run optimize-images` (executado automaticamente no prebuild)
- [ ] CSS final minificado pelo Vite

---

## 4. Variáveis CSS úteis

```css
:root {
  /* Espaçamentos */
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 1rem;      /* 16px */
  --space-lg: 1.5rem;    /* 24px */
  --space-xl: 2rem;      /* 32px */
  --space-2xl: 3rem;     /* 48px */
  --space-3xl: 4rem;     /* 64px */

  /* Layout */
  --container: min(1120px, 100% - 2rem);
  --header-h: 72px;       /* 56px em ≤1024px */
  --radius: 0.5rem;
  --radius-lg: 0.75rem;
}
```

---

## 5. Ferramentas de teste recomendadas

| Ferramenta | Uso |
|---|---|
| Chrome DevTools → Device Toolbar | Simular viewports e orientação |
| Firefox Responsive Design Mode | Alternativa com regras de media query visíveis |
| [Responsively App](https://responsively.app/) | Ver múltiplos dispositivos em simultâneo |
| [BrowserStack](https://browserstack.com) | Testar em dispositivos reais (iOS Safari, Samsung Internet) |
| `@media (orientation: landscape)` no DevTools | Activar simulação de landscape |

**Tamanhos de viewport para testar obrigatoriamente:**
```
320 × 568   iPhone SE (landscape: 568 × 320)
375 × 667   iPhone 6/7/8 (landscape: 667 × 375)
390 × 844   iPhone 12/13 (landscape: 844 × 390)
414 × 896   iPhone 11 Pro Max
768 × 1024  iPad portrait (landscape: 1024 × 768)
1024 × 768  Desktop/laptop pequeno
```
