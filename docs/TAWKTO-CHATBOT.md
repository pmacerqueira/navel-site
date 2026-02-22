# Análise: Chatbot tawk.to no site Navel

## Objetivo

Adicionar um **chat em tempo real** no site como **complemento ao WhatsApp**, usando [tawk.to](https://www.tawk.to) — ferramenta de live chat gratuita.

## Por que tawk.to?

| Aspeto | Detalhe |
|--------|--------|
| **Custo** | 100% gratuito para uso próprio (agentes ilimitados, chats ilimitados, vários sites). |
| **Modelo de negócio** | Monetizam com “Hired Agents” (agentes pagos por hora) para quem não quer responder; o software em si é free. |
| **Integração** | Snippet JavaScript no site; instalação em poucos minutos. |
| **Funcionalidades** | Live chat, ticketing, base de conhecimento, CRM básico, Chat Pages, AI Assist (novo). |
| **Idiomas** | 45+ idiomas (inclui PT, EN, ES — alinhado ao site). |
| **Privacidade** | Sem anúncios; não vendem dados; comunicação em SSL; [política de privacidade](https://www.tawk.to/privacy-policy/) própria. |
| **Suporte** | Suporte 24×7 por chat e email. |

**Referência:** [tawk.to – 100% FREE live chat software](https://www.tawk.to)

## Complemento ao WhatsApp

- **WhatsApp** (botão flutuante atual): ideal para quem prefere falar por telemóvel, já tem o número, ou quer continuar a conversa fora do site.
- **tawk.to (chat no site)**: conversa imediata na própria página, sem sair do browser; histórico no dashboard; vários agentes; base de conhecimento e (opcional) AI Assist.

Os dois podem coexistir: o visitante escolhe “Chat” (widget tawk.to) ou “WhatsApp”.

## Implementação técnica (resumo)

1. **Conta tawk.to**  
   Registar em [tawk.to](https://www.tawk.to), criar uma Property para o site Navel e obter o código do widget (Property ID e Widget ID) em *Administration → Chat Widget*.

2. **Onde carregar o script**  
   - **Recomendado (RGPD):** carregar o script do widget **apenas após** o utilizador aceitar cookies (como já fazem com o consentimento no site).  
   - Assim evitamos ativar cookies/scripts de terceiros antes do consentimento.

3. **Onde aparece o widget**  
   O tawk.to adiciona o seu próprio widget flutuante (por defeito um ícone de chat). É configurável no dashboard (posição, cores, mensagem de boas-vindas).  
   - Podem manter o WhatsApp num canto (ex.: inferior direito) e o chat tawk.to noutro (ex.: inferior esquerdo), ou usar apenas um ícone que abre um menu “Chat” / “WhatsApp”.

4. **Constantes no projeto**  
   No código, usar variáveis de ambiente ou constantes para **Property ID** e **Widget ID**, para não expor dados sensíveis e facilitar troca de conta/ambiente.

5. **Política de privacidade**  
   Incluir na página de Privacidade que o site utiliza o tawk.to para chat em tempo real, com link para a [política de privacidade do tawk.to](https://www.tawk.to/privacy-policy/).

6. **CSP (Content-Security-Policy)**  
   Se o `.htaccess` ou o servidor definirem CSP, pode ser necessário autorizar `https://embed.tawk.to` e `https://*.tawk.to` (conforme documentação tawk.to).

## Prós e contras

**Vantagens**

- Gratuito, sem limite de agentes nem de chats.
- Integração simples (um snippet).
- Complementa o WhatsApp sem o substituir.
- Suporte 24×7 e documentação clara.
- Possibilidade de Knowledge Base e AI Assist.

**Atenções**

- **Branding:** o widget pode exibir “Powered by tawk.to”; remoção costuma ser paga (opcional).
- **Dados em terceiros:** as conversas ficam nos servidores tawk.to (EUA/Google Cloud); referir na política de privacidade.
- **Cookies/script:** carregar apenas após consentimento de cookies (implementação já preparada no componente `TawkWidget`).

## Passos para ativar

1. Criar conta em [tawk.to](https://www.tawk.to) e obter o código do widget (Property ID e Widget ID).
2. No projeto, preencher em `src/constants.js` (ou em variáveis de ambiente) os valores `TAWK_PROPERTY_ID` e `TAWK_WIDGET_ID`.
3. O componente `TawkWidget` já está integrado no `Layout`; o script só é carregado após o utilizador aceitar cookies.
4. No dashboard tawk.to: configurar mensagem de boas-vindas, cores (ex.: vermelho corporativo `#b90211`), idioma e posição do widget.
5. Atualizar a página **Privacidade** com a referência ao uso do tawk.to e link para a política deles.
6. (Opcional) Se usarem CSP, adicionar os domínios tawk.to conforme a [documentação tawk.to](https://help.tawk.to/article/adding-a-widget-to-your-website).

## Referências

- [tawk.to](https://www.tawk.to)  
- [Adding the widget to your website](https://help.tawk.to/article/adding-a-widget-to-your-website)  
- [Where to find Property and Widget IDs](https://help.tawk.to/article/where-can-i-find-the-property-and-widget-id)  
- [tawk.to Privacy Policy](https://www.tawk.to/privacy-policy/)
