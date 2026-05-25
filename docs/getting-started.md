# Guia de Desenvolvimento e Integracao

## Objetivo

Subir o backend localmente e validar, em poucos passos, que qualquer frontend consegue integrar com o contrato HTTP.

## Portas locais (docker compose dev)

| Servico | Porta |
| --- | --- |
| API | 7200 |
| PostgreSQL dev | 7201 |
| MinIO API | 7202 |
| MinIO Console | 7203 |
| PostgreSQL teste | 7204 |

## Subir ambiente de desenvolvimento

```bash
docker compose -f docker-compose.local.yml up --build
```

Esse ambiente sobe automaticamente:

- API em modo watch
- PostgreSQL
- MinIO
- bucket inicial
- schema sincronizado
- seed de bootstrap (categorias + admin opcional)

## Parar e limpar ambiente

```bash
docker compose -f docker-compose.local.yml down -v
```

## Endpoints uteis para integracao

- API: http://localhost:7200/v1
- Health: http://localhost:7200/health
- Swagger: http://localhost:7200/swagger
- Playground gateway (login admin): http://localhost:7200/playground
- Playground app protegida: http://localhost:7200/playground/app
- MinIO Console: http://localhost:7203

## Sequencia recomendada de validacao

1. verificar health
2. registrar ou logar usuario
3. consumir listagens publicas
4. chamar rota protegida com bearer token
5. executar refresh token
6. enviar tentativa de quiz
7. solicitar questoes de pratica livre e enviar respostas
8. usar fluxo de UI do admin para aprovar questoes pendentes

## Comandos principais

### Qualidade

```bash
bun run check
bun run typecheck
```

### Testes

```bash
bun run test:fast
bun run test
```

Trocar porta do banco de teste:

```bash
TEST_DB_PORT=7214 bun run test
```

### Admin operacional

Criar admin:

```bash
bun run admin:create -- \
  --email admin@example.com \
  --username admin_local \
  --password "use-uma-senha-forte-aqui"
```

Promover usuario existente:

```bash
bun run admin:create -- --email usuario_existente@example.com
```

Resetar a senha de um usuario (admin) — pode ser feito via API depois que o admin estiver logado:

```bash
# Senha especifica
curl -X POST http://localhost:7200/v1/admin/users/USER_UUID/reset-password \
  -H "content-type: application/json" \
  -H "authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{"password": "temporaria-segura-1"}'

# Senha gerada automaticamente
curl -X POST http://localhost:7200/v1/admin/users/USER_UUID/reset-password \
  -H "content-type: application/json" \
  -H "authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{}'
```

A resposta inclui a senha aplicada (`generated: true` quando o servidor escolheu). Repasse-a ao usuario por um canal seguro — ela so e mostrada uma vez.

### Fluxo do playground admin

1. criar ou promover um usuario admin
2. abrir http://localhost:7200/playground
3. efetuar login no gateway admin
4. o frontend chama `POST /playground/session` com `Authorization: Bearer <accessToken>`
5. backend retorna cookie HttpOnly `stackoverquiz_playground`
6. frontend redireciona para `/playground/app` e passa a consumir assets protegidos em `/playground/assets/*`
7. ao sair, frontend chama `DELETE /playground/session` para limpar o cookie

Se o usuario autenticado nao for admin, o bootstrap da sessao falha com `403 FORBIDDEN` e o gateway direciona para `/playground/forbidden`.

## Smoke check de integracao

### 1. Health

```bash
curl -i http://localhost:7200/health
```

### 2. Registro

```bash
curl -X POST http://localhost:7200/v1/auth/register \
  -H "content-type: application/json" \
  -d '{
    "username": "frontend_dev",
    "email": "frontend_dev@example.com",
    "password": "test-password-123"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:7200/v1/auth/login \
  -H "content-type: application/json" \
  -d '{
    "email": "frontend_dev@example.com",
    "password": "test-password-123"
  }'
```

### 4. Listagens publicas

```bash
curl http://localhost:7200/v1/questions
curl http://localhost:7200/v1/quizzes
curl http://localhost:7200/v1/categories
```

### 5. Rota protegida

```bash
curl http://localhost:7200/v1/auth/me \
  -H "authorization: Bearer SEU_ACCESS_TOKEN"
```

### 6. Refresh token

```bash
curl -X POST http://localhost:7200/v1/auth/refresh \
  -H "content-type: application/json" \
  -d '{
    "refreshToken": "SEU_REFRESH_TOKEN"
  }'
```

### 7. Tentativa de quiz

```bash
curl -X POST http://localhost:7200/v1/quizzes/QUIZ_UUID/attempt \
  -H "content-type: application/json" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{
    "answers": [
      { "questionId": "QUESTION_1", "selectedOptionIndex": 1 },
      { "questionId": "QUESTION_2", "selectedOptionIndex": 0 }
    ]
  }'
```

### 8. Lote de Prática Livre

```bash
curl "http://localhost:7200/v1/practice/questions?limit=5" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN"
```

### 9. Responder Prática

```bash
curl -X POST http://localhost:7200/v1/practice/answer \
  -H "content-type: application/json" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{
    "questionId": "QUESTION_UUID",
    "selectedOptionIndex": 2
  }'
```

### 10. Listar Perguntas Pendentes (Admin)

```bash
curl "http://localhost:7200/v1/admin/content/questions?status=pending" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN"
```

### 11. Trocar a propria senha

```bash
curl -X POST http://localhost:7200/v1/auth/change-password \
  -H "content-type: application/json" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{
    "currentPassword": "senha-antiga",
    "newPassword": "nova-senha-com-no-minimo-8-caracteres"
  }'
```

### 12. Listar meu proprio conteudo (incluindo pending)

```bash
curl "http://localhost:7200/v1/questions?author=me" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN"

curl "http://localhost:7200/v1/quizzes?author=me" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN"
```

### 13. Responder quiz como anonimo (sem token)

```bash
curl -X POST http://localhost:7200/v1/quizzes/QUIZ_UUID/attempt \
  -H "content-type: application/json" \
  -d '{
    "answers": [
      { "questionId": "QUESTION_1", "selectedOptionIndex": 0 }
    ]
  }'
```

A resposta inclui `saved: false` e `xpGained: 0` — o backend valida e retorna o resultado, mas nao persiste nem concede XP.

## Estrutura de testes

| Camada | Pasta | Uso |
| --- | --- | --- |
| Unit | tests/unit | regras puras |
| Integration | tests/integration | contrato HTTP e middlewares |
| E2E | tests/e2e | fluxos completos com Postgres |

## Troubleshooting rapido

### Porta ocupada

- verificar containers antigos com docker compose ps
- verificar conflito local em 7201 ou 7204

### Falha de teste com banco

- confirmar TEST_DATABASE_URL com sufixo de teste
- validar disponibilidade da porta 7204
- tentar TEST_DB_PORT=7214 bun run test

### OAuth local falhando

- revisar callbacks:
  - Google: http://localhost:7200/v1/auth/google/callback
  - GitHub: http://localhost:7200/v1/auth/github/callback

### Playground admin bloqueado

- `302 /playground/app -> /playground`: cookie de playground ausente ou expirado
- `401` em `/playground/session` ou `/playground/assets/*`: sessao playground invalida
- `403` em `/playground/session`: token valido, mas usuario sem papel admin
- conferir se a conta foi promovida com `bun run admin:create -- --email ...`

### Storage falhando

- abrir http://localhost:7203
- confirmar variaveis MINIO_* no ambiente local
- confirmar STORAGE_DRIVER e GCS_BUCKET em Cloud Run
- validar dependencia storage no /health
