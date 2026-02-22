# Estrutura de imagens

Todas as imagens do site estão organizadas em subpastas:

| Ficheiro/Pasta | Uso |
|----------------|-----|
| **logo.png** | Logo do site (header, footer) |
| **og-image.png** | Imagem para partilha social (Open Graph, Twitter Card). Dimensões: 1200×630 px. |
| **brands/** | Logos das marcas (página Marcas, rodapé, hero). Inclui PNG/SVG (Facom, Cleancraft, Aircraft, Schweisscraft, Holzkraft, Unicraft, Optimum, etc.). Otimizados por `npm run optimize-images` (max 400px largura). |
| **campaigns/** | Thumbnails das campanhas (Home, Novidades) |

## Adicionar nova marca

1. Coloque o logo em `brands/` (ex: `nova-marca.png` ou `.webp`)
2. Referencie como `/images/brands/nova-marca.png` em `src/data/brands.js`
3. Execute `OPTIMIZAR.bat` (ou `npm run optimize-images`) para comprimir e reduzir tamanho

## Atualizar imagem de partilha

Substitua `og-image.png` mantendo o nome e dimensões 1200×630 px para melhor exibição em Facebook, LinkedIn, WhatsApp e Twitter.
