# tawk.to — Próximos passos (quando voltares)

> Documento de acompanhamento operacional (histórico/evolutivo).
> Para estado arquitetural atual, usar `docs/ARQUITETURA.md` e `CHANGELOG.md`.

O código já está no projeto (componente `TawkWidget`, constantes, Layout). Falta só ativar com a tua conta.

## Checklist rápido

1. **Criar conta** em [tawk.to](https://www.tawk.to) e obter o código do widget.
2. **IDs:** Em tawk.to → *Administration* → *Chat Widget* → copiar **Property ID** e **Widget ID**.
3. **No projeto** (escolher uma opção):
   - **Opção A:** Editar `src/constants.js` e preencher:
     - `TAWK_PROPERTY_ID = 'o_teu_property_id'`
     - `TAWK_WIDGET_ID = 'o_teu_widget_id'`
   - **Opção B:** Criar/editar `.env` na raiz do projeto:
     - `VITE_TAWK_PROPERTY_ID=o_teu_property_id`
     - `VITE_TAWK_WIDGET_ID=o_teu_widget_id`
4. **Dashboard tawk.to:** Ajustar mensagem de boas-vindas, cores (ex.: `#b90211`) e posição do widget.
5. **Privacidade:** Na página Privacidade do site, referir o uso do tawk.to e link para [política do tawk.to](https://www.tawk.to/privacy-policy/).

## Documentação no projeto

- **Análise completa:** `docs/TAWKTO-CHATBOT.md`
- **Componente:** `src/components/TawkWidget.jsx` (carrega só após aceitar cookies)

Até à próxima.
