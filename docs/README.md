# Documentacao do Backend

## Objetivo

Esta documentacao descreve como integrar qualquer frontend com a API REST do StackOverquiz.

Escopo suportado:

- web (SPA, SSR, MPA)
- mobile (nativo ou cross-platform)
- desktop
- BFF e integracoes server-to-server

## Leitura rapida

- [Guia de desenvolvimento](./getting-started.md)
- [Referencia da API](./api-reference.md)
- [Regras de dominio](./domain-rules.md)
- [Operacao e release](./operations.md)

## Quando usar cada arquivo

- getting-started.md: subir ambiente local, validar saude da API e executar smoke checks de integracao
- api-reference.md: contrato HTTP completo, autenticacao, erros, paginacao e catalogo de endpoints
- domain-rules.md: regras de negocio que afetam UX, score, XP, visibilidade e permissoes
- operations.md: observabilidade, diagnostico de incidentes e checklist de release

## Visao de arquitetura

- Cliente integra com endpoints versionados em /v1
- API executa regras de negocio e validacoes de contrato
- Persistencia principal em PostgreSQL
- Objetos de imagem em MinIO local ou Google Cloud Storage
- Geracao de conteudo assistida por Gemini (somente admin)

## Contrato em uma pagina

1. Toda resposta segue envelope padronizado de sucesso ou erro.
2. Toda resposta inclui x-request-id para rastreabilidade.
3. Rotas protegidas exigem Authorization Bearer <accessToken>.
4. Sessao usa access token + refresh token com rotacao de refresh.
5. Dados publicos de perguntas e quizzes nao expoem gabarito.
6. Score, XP e progresso sao sempre calculados no backend.

## Fluxo funcional resumido

1. Cliente autentica via login, registro ou OAuth.
2. Cliente consome catalogo publico (questions, quizzes, categories).
3. Cliente envia tentativa de quiz; backend valida e calcula resultado oficial.
4. Cliente pode usar modo livre para responder perguntas aleatorias fora de um quiz.
5. Cliente envia rating/report quando necessario.
6. Cliente consulta perfil, historico e leaderboards.
7. Admin gera conteudo por IA e aprova/rejeita perguntas e quizzes antes de publicacao.

## Endpoints de entrada

- API local (dev): http://localhost:7200/v1
- Health: http://localhost:7200/health
- Swagger: http://localhost:7200/swagger
- Playground: http://localhost:7200/playground

## Estado atual

O backend esta pronto para desenvolvimento serio e beta controlado.

Capacidades consolidadas:

- autenticacao com sessao persistida e refresh token rotativo
- invalidacao imediata de sessao no logout
- mudanca de senha pelo proprio usuario com revogacao das outras sessoes
- reset de senha por admin com geracao opcional de senha temporaria
- acesso publico para navegar e responder perguntas/quizzes (anonimos nao ganham XP nem tem progresso persistido)
- regras de visibilidade publica sem vazamento de gabarito
- score e XP oficiais no backend
- moderacao com rating/report por usuario e revisao admin
- geracao IA de perguntas e quizzes como conteudo pendente
- modo livre com progresso e XP de primeira resposta
- indicador de quiz ja respondido para usuario autenticado
- leaderboard de quiz com deduplicacao da melhor tentativa por usuario
- filtros de listagem por autor (`author=<uuid|me>`) em perguntas e quizzes
- suite automatizada com banco temporario

Riscos conhecidos:

- falhas de provedor de IA podem exigir tratamento adicional no cliente
- estado OAuth em memoria antes de estrategia multi-instancia (problema em multi-instancia, exige Redis)
- ainda nao ha flow de recuperacao de senha por email; reset depende de contato direto com admin
