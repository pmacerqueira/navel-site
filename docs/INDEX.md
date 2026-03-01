# Índice Rápido de Documentação — navel-site

## Continuidade entre agentes (obrigatório)
- Não assumir memória global automática entre chats/sessões.
- Não assumir aprendizagem permanente automática de um modelo para outro.
- A continuidade real vem de: código, `.cursor/rules`, `CHANGELOG.md` e esta documentação.
- Em cada nova conversa, iniciar com resumo curto: objetivo, estado atual, risco principal, ficheiros canónicos e próxima ação.

## Essencial
- `README.md` — comandos e visão geral
- `DEPLOY.md` — publicação cPanel
- `docs/SETUP.md` — setup local completo
- `docs/TROUBLESHOOTING.md` — resolução de problemas
- `docs/ARQUITETURA.md` — arquitetura e separação com AT_Manut
- `docs/CREDENCIAIS-SEGURANCA.md` — política de secrets
- `CHANGELOG.md` — histórico de alterações

## Especializado
- `docs/SUPABASE.md` — setup e operação Supabase
- `docs/SEO.md` — otimização SEO
- `docs/RESPONSIVIDADE.md` — padrões responsive
- `docs/OTIMIZACOES.md` — performance/build

## Regra de ouro
Antes de fechar uma fase:
1. validar setup + build local;
2. rever credenciais e `.gitignore`;
3. atualizar docs alterados, changelog e nota curta de sessão;
4. só depois preparar publicação.

