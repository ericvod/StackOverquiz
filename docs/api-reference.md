# Referencia da API

> [!TIP]
> **Consulte o OpenAPI (Swagger)!**
> Nossa API possui seus schemas totalmente modelados e validados no nível de código. 
> A documentação interativa OpenAPI é a principal fonte da verdade para visualizar exatamente quais campos devem ser preenchidos, os tipos de dados e os status exatos retornados por cada endpoint.
>
> 👉 **[Acessar Swagger Interativo em Localhost](http://localhost:7200/swagger)**

## Base URL e versionamento

- Local: http://localhost:7200
- Prefixo versionado: `/v1`
- Swagger: `http://localhost:7200/swagger`
- Playground gateway (login admin): `http://localhost:7200/playground`
- Playground app protegida: `http://localhost:7200/playground/app`

Recomendacao para clientes:

1. tratar `/v1` como base estavel do contrato
2. centralizar base URL e headers em um client HTTP unico

## Convencoes de resposta

### Envelope de sucesso

```json
{
  "success": true,
  "data": {},
  "meta": {
    "apiVersion": "v1"
  }
}
```

### Envelope de erro

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_ACCESS_TOKEN",
    "message": "Missing or invalid authorization header",
    "details": {}
  },
  "meta": {
    "apiVersion": "v1"
  }
}
```

### Headers relevantes

- authorization: Bearer <accessToken>
- content-type: application/json
- x-request-id: <id-opcional-fornecido-pelo-cliente>

O backend sempre devolve x-request-id na resposta, mesmo sem envio do cliente.

## Paginacao

Endpoints de listagem retornam meta.pagination:

```json
{
  "meta": {
    "apiVersion": "v1",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

Padroes:

- page default: 1
- limit default: 20
- limit maximo: 100

## Autenticacao e sessao

### Token bundle

```json
{
  "tokenType": "Bearer",
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "accessTokenExpiresInSeconds": 900,
  "refreshTokenExpiresInSeconds": 604800
}
```

### Fluxo recomendado de sessao

1. cliente faz login, registro ou OAuth callback e recebe user + tokens
2. cliente envia accessToken no header Authorization para rotas protegidas
3. ao receber AUTH_INVALID_ACCESS_TOKEN, cliente tenta refresh
4. refresh bem-sucedido substitui os dois tokens localmente
5. ao receber AUTH_INVALID_REFRESH_TOKEN, cliente limpa sessao local e volta para login
6. logout revoga a sessao e invalida imediatamente o access token dessa sessao

### Endpoints de auth

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| POST | /v1/auth/register | Publico | Cria conta local e retorna sessao |
| POST | /v1/auth/login | Publico | Login local por email e senha |
| POST | /v1/auth/refresh | Publico | Rotaciona sessao via refresh token |
| GET | /v1/auth/google | Publico | Inicia OAuth Google |
| GET | /v1/auth/github | Publico | Inicia OAuth GitHub |
| GET | /v1/auth/me | Autenticado | Retorna usuario autenticado |
| POST | /v1/auth/change-password | Autenticado | Atualiza propria senha (revoga outras sessoes) |
| POST | /v1/auth/logout | Autenticado | Revoga sessao atual |

Os callbacks `/v1/auth/google/callback` e `/v1/auth/github/callback` existem mas sao acionados apenas pelo provedor OAuth e nao aparecem no Swagger.

## Playground admin gateway

### Rotas principais

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | /playground | Publico | Gateway de login admin |
| GET | /playground/app | Cookie playground admin | UI principal do playground |
| GET | /playground/forbidden | Publico | Tela de acesso negado para nao-admin |
| GET | /playground/session | Cookie playground admin | Verifica sessao ativa |
| POST | /playground/session | Bearer token admin | Cria cookie HttpOnly de sessao playground |
| DELETE | /playground/session | Cookie playground opcional | Encerra sessao playground |

### Assets do playground

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | /playground/login-assets/* | Publico | CSS/JS do gateway de login |
| GET | /playground/assets/* | Cookie playground admin | CSS/JS da aplicacao protegida |

### Status esperados no fluxo

- `POST /playground/session`:
  - `200` para usuario admin autenticado
  - `403 FORBIDDEN` para usuario autenticado sem papel admin
- `GET /playground/session`:
  - `200` com sessao playground valida
  - `401 UNAUTHORIZED` sem cookie ou com cookie invalido/expirado
  - `403 FORBIDDEN` quando a conta perde papel admin durante sessao ativa
- `GET /playground/app`:
  - `200` com cookie admin valido
  - `302 -> /playground` sem sessao valida
  - `302 -> /playground/forbidden` para sessao autenticada sem role admin

## Catalogo de endpoints

### Infra e descoberta

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | /health | Publico | Status de API, banco e storage |
| GET | /swagger | Publico | Documentacao OpenAPI |
| GET | /playground | Publico | Gateway admin para o playground |
| GET | /playground/app | Cookie playground admin | App do playground protegido |
| GET | /playground/session | Cookie playground admin | Estado da sessao playground |
| POST | /playground/session | Bearer token admin | Bootstrap da sessao playground |
| DELETE | /playground/session | Cookie playground opcional | Limpa sessao playground |

### Perguntas

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | /v1/questions | Publico com auth opcional | Lista perguntas aprovadas; aceita `author=<uuid\|me>` |
| GET | /v1/questions/random | Publico com auth opcional | Sorteia pergunta aprovada |
| GET | /v1/questions/:id | Publico | Detalhe publico sem gabarito |
| POST | /v1/questions | Autenticado | Cria pergunta pendente por padrao |
| PUT | /v1/questions/:id | Autenticado | Atualiza pergunta (autor/admin) |
| DELETE | /v1/questions/:id | Autenticado | Remove pergunta (autor/admin) |
| POST | /v1/questions/:id/rate | Autenticado | Avalia pergunta |
| POST | /v1/questions/:id/report | Autenticado | Reporta pergunta |

### Quizzes

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | /v1/quizzes | Publico com auth opcional | Lista quizzes publicos aprovados; aceita `author=<uuid\|me>` |
| GET | /v1/quizzes/:id | Publico com auth opcional | Detalhe de quiz publico aprovado |
| GET | /v1/quizzes/:id/leaderboard | Publico | Ranking por quiz publico |
| POST | /v1/quizzes | Autenticado | Cria quiz pendente por padrao |
| PUT | /v1/quizzes/:id | Autenticado | Atualiza quiz (criador) |
| DELETE | /v1/quizzes/:id | Autenticado | Remove quiz (criador/admin) |
| POST | /v1/quizzes/:id/attempt | Publico com auth opcional | Submete tentativa; anonimos recebem feedback sem persistencia e sem XP |

### Categorias

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | /v1/categories | Publico com auth opcional | Lista categorias |
| GET | /v1/categories/:slug | Publico | Detalhe da categoria por slug |
| GET | /v1/categories/:slug/questions | Publico com auth opcional | Feed de perguntas da categoria |

### Usuarios e ranking

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | /v1/users/:id/profile | Publico | Perfil publico |
| PATCH | /v1/users/me | Autenticado | Atualiza username e avatarUrl |
| GET | /v1/users/:id/history | Autenticado | Historico privado (dono/admin) |
| GET | /v1/leaderboard | Publico | Ranking global por XP |

### Uploads

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| POST | /v1/uploads/image | Autenticado | Upload de imagem (jpeg/png/webp/gif ate 5MB) |
| GET | /v1/uploads/* | Publico | Obtem URL assinada para chave existente |

### Practice

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | /v1/practice/questions | Publico com auth opcional | Retorna lote aleatorio de perguntas aprovadas |
| POST | /v1/practice/answer | Publico com auth opcional | Responde uma pergunta solta; anonimos so recebem feedback (sem XP/progresso) |

### IA (admin)

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| POST | /v1/ai/generate | Admin | Gera perguntas para uma categoria/dificuldade |
| POST | /v1/ai/generate-quiz | Admin | Gera quiz completo como rascunho pendente |
| POST | /v1/ai/generate/batch | Admin | Gera perguntas em lotes |

Campos principais:

- `category`, `difficulty`, `count`, `language`, `categoryIds`
- `generate-quiz` usa `title`, `description`, `category`, `categoryIds` e `difficultyMix`
- `geminiApiKey` opcional: chave Gemini informada pelo admin para aquela requisicao; o playground pode salva-la localmente no navegador do admin

Conteudo gerado por IA nasce com `status=pending` e nao aparece nas rotas publicas ate aprovacao admin.

### Moderacao admin

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | /v1/admin/content/questions | Admin | Lista perguntas por status de revisao |
| POST | /v1/admin/content/questions/:id/approve | Admin | Aprova pergunta |
| POST | /v1/admin/content/questions/:id/reject | Admin | Rejeita pergunta com motivo |
| GET | /v1/admin/content/quizzes | Admin | Lista quizzes por status de revisao |
| GET | /v1/admin/content/quizzes/:id | Admin | Detalhe admin de quiz em revisao |
| POST | /v1/admin/content/quizzes/:id/approve | Admin | Aprova quiz |
| POST | /v1/admin/content/quizzes/:id/reject | Admin | Rejeita quiz com motivo |

### Admin de usuarios

| Metodo | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | /v1/admin/users | Admin | Lista todos os usuarios com paginacao; suporta filtros por busca e papel. Inclui email — exclusivo para admins |
| POST | /v1/admin/users/:id/reset-password | Admin | Forca reset de senha; aceita `password` opcional, gera uma temporaria se omitido. Revoga todas as sessoes do alvo |

Ao aprovar quiz com perguntas ainda nao aprovadas, envie:

```json
{
  "approveQuestions": true
}
```

## Parametros e filtros mais usados

### GET /v1/questions

- page, limit, search
- sort: rating, popular, recent
- difficulty: beginner, easy, medium, hard, expert
- category: slug da categoria
- excludeAnswered: true ou false
- author: UUID do autor ou `me`

Observacoes:

- `excludeAnswered=true` exige token valido
- `author=me` exige token valido; resolve para o viewer
- Quando o viewer filtra pelo proprio autor (`me` ou UUID que bate com o viewer), perguntas em `pending` e `rejected` tambem sao retornadas

### GET /v1/questions/random

- difficulty
- category
- excludeAnswered (exige token)

### GET /v1/categories/:slug/questions

- page, limit
- excludeAnswered (exige token)

### GET /v1/quizzes

- page, limit, search
- author: UUID do criador ou `me`

Observacoes:

- `author=me` exige token valido
- Quando o viewer filtra pelo proprio autor, quizzes privados/pending/rejected criados por ele tambem aparecem

Com token valido, a resposta inclui indicadores opcionais por quiz:

- attemptedByViewer
- viewerBestScore
- viewerLastAttemptAt

### GET /v1/quizzes/:id

Com token valido, o detalhe inclui `viewerAttemptSummary`:

- attempted
- attemptCount
- bestScore
- lastScore
- lastAttemptAt

### GET /v1/practice/questions

- limit: default 10, maximo 50
- difficulty: uma dificuldade unica
- difficulties: lista separada por virgula, exemplo `easy,medium`
- category: slug da categoria
- excludeAnswered: true ou false
- includeAnswered: true ou false

Observacao: excludeAnswered=true exige token valido, exceto quando includeAnswered=true.

### GET /v1/admin/users

Exige papel `admin`.

- page: numero da pagina (minimo 1, default 1)
- limit: itens por pagina (minimo 1, maximo 100, default 20)
- search: busca parcial e case-insensitive no username ou email
- role: filtra por papel — `user` ou `admin`

Resposta inclui: `id`, `username`, `email`, `role`, `xp`, `level`, `createdAt`. Ordenado por data de cadastro decrescente.

## Fluxos de integracao recomendados

### Fluxo 1: onboarding e sessao

1. POST /v1/auth/register ou POST /v1/auth/login
2. armazenar tokenType, accessToken, refreshToken e expiracao
3. GET /v1/auth/me para hidratar estado autenticado

### Fluxo 2: descoberta de conteudo

1. GET /v1/categories
2. GET /v1/questions e GET /v1/quizzes
3. GET /v1/questions/:id ou GET /v1/quizzes/:id para detalhe

### Fluxo 3: tentativa de quiz

1. montar answers com questionId + selectedOptionIndex para todas as perguntas
2. POST /v1/quizzes/:id/attempt (com ou sem token)
3. atualizar UI com score, xpGained, isPerfect e totalQuestions
4. usuarios autenticados recebem `saved: true` + XP e historico persistidos; anonimos recebem `saved: false` + xpGained 0

### Fluxo 4: modo livre

1. GET /v1/practice/questions com filtros opcionais
2. renderizar opcoes sem gabarito
3. POST /v1/practice/answer (com ou sem token)
4. atualizar UI com isCorrect, correctOptionIndex, explanation, xpGained e alreadyAnswered
5. para anonimos: xpGained sempre 0 e alreadyAnswered sempre false

### Fluxo 5: qualidade de conteudo

1. POST /v1/questions/:id/rate
2. POST /v1/questions/:id/report quando houver problema

### Fluxo 6: perfil e historico

1. GET /v1/users/:id/profile para tela publica
2. GET /v1/users/:id/history para tela privada (somente dono/admin)
3. GET /v1/leaderboard para ranking global

### Fluxo 7: playground admin

1. autenticar com POST /v1/auth/login
2. enviar access token em POST /playground/session
3. abrir GET /playground/app com cookie HttpOnly emitido no passo anterior
4. ao finalizar, chamar DELETE /playground/session

## Erros de contrato mais relevantes

| Code | HTTP | Causa comum | Acao recomendada no cliente |
| --- | --- | --- | --- |
| AUTH_INVALID_CREDENTIALS | 401 | Email/senha invalidos | Exibir erro de autenticacao |
| AUTH_INVALID_ACCESS_TOKEN | 401 | Token ausente, invalido ou sessao revogada | Tentar refresh |
| AUTH_INVALID_REFRESH_TOKEN | 401 | Refresh invalido/expirado/reutilizado | Limpar sessao local e relogar |
| AUTH_REFRESH_TOKEN_SUBJECT_MISMATCH | 401 | Logout com token de outro usuario | Tratar como sessao invalida |
| AUTH_INVALID_OAUTH_STATE | 400 | State OAuth invalido | Reiniciar fluxo OAuth |
| QUESTION_INVALID_CORRECT_OPTION_INDEX | 422 | Payload de pergunta inconsistente | Corrigir formulario |
| QUESTION_DUPLICATE_REPORT | 409 | Usuario reportou a mesma pergunta antes | Exibir status ja reportado |
| QUIZ_DUPLICATE_QUESTION_IDS | 422 | Quiz com IDs repetidos | Deduplicar antes de enviar |
| QUIZ_UNKNOWN_QUESTION_IDS | 422 | Quiz referencia pergunta inexistente | Recarregar selecao |
| QUIZ_HAS_UNAPPROVED_QUESTIONS | 422 | Aprovar quiz com perguntas pendentes sem approveQuestions | Revisar ou aprovar perguntas vinculadas |
| QUIZ_NO_AVAILABLE_QUESTIONS | 422 | Quiz sem perguntas visiveis para o ator | Bloquear tentativa |
| QUIZ_DUPLICATE_ANSWERS | 422 | Tentativa com perguntas duplicadas | Validar payload |
| QUIZ_ANSWER_OUT_OF_SCOPE | 422 | Resposta para pergunta fora do quiz | Recarregar quiz |
| QUIZ_INCOMPLETE_ANSWERS | 422 | Nem todas as perguntas foram respondidas | Exigir cobertura total |
| QUIZ_INVALID_OPTION_INDEX | 422 | selectedOptionIndex invalido | Validar indices locais |

## Exemplos HTTP

### Login

```bash
curl -X POST http://localhost:7200/v1/auth/login \
  -H "content-type: application/json" \
  -d '{
    "email": "dev@example.com",
    "password": "test-password-123"
  }'
```

### Refresh de sessao

```bash
curl -X POST http://localhost:7200/v1/auth/refresh \
  -H "content-type: application/json" \
  -d '{
    "refreshToken": "SEU_REFRESH_TOKEN"
  }'
```

### Listagem de perguntas sem respondidas

```bash
curl "http://localhost:7200/v1/questions?excludeAnswered=true" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN"
```

### Tentativa de quiz

```bash
curl -X POST http://localhost:7200/v1/quizzes/QUIZ_UUID/attempt \
  -H "content-type: application/json" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{
    "answers": [
      { "questionId": "QUESTION_1", "selectedOptionIndex": 2 },
      { "questionId": "QUESTION_2", "selectedOptionIndex": 0 }
    ],
    "timeSpentSeconds": 54
  }'
```

### Tentativa de quiz como anonimo

Mesma chamada sem o header `authorization`. A resposta inclui `saved: false` e `xpGained: 0`.

```bash
curl -X POST http://localhost:7200/v1/quizzes/QUIZ_UUID/attempt \
  -H "content-type: application/json" \
  -d '{
    "answers": [
      { "questionId": "QUESTION_1", "selectedOptionIndex": 2 }
    ]
  }'
```

### Mudar a propria senha

```bash
curl -X POST http://localhost:7200/v1/auth/change-password \
  -H "content-type: application/json" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{
    "currentPassword": "senha-antiga",
    "newPassword": "nova-senha-com-no-minimo-8-caracteres"
  }'
```

### Admin: listar usuarios

```bash
# Todos os usuarios (paginado)
curl "http://localhost:7200/v1/admin/users" \
  -H "authorization: Bearer ADMIN_ACCESS_TOKEN"

# Filtrar por busca + papel
curl "http://localhost:7200/v1/admin/users?search=joao&role=user&page=1&limit=20" \
  -H "authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Admin: reset de senha de outro usuario

```bash
# Com senha especifica
curl -X POST http://localhost:7200/v1/admin/users/USER_UUID/reset-password \
  -H "content-type: application/json" \
  -H "authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{"password": "temporaria-forte-123"}'

# Sem senha: o servidor gera uma temporaria e retorna no payload
curl -X POST http://localhost:7200/v1/admin/users/USER_UUID/reset-password \
  -H "content-type: application/json" \
  -H "authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{}'
```

### Listar minhas proprias perguntas (incluindo pending)

```bash
curl "http://localhost:7200/v1/questions?author=me" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN"
```
