# Operacao e Release

## Objetivo

Centralizar praticas de observabilidade, diagnostico e release para manter a integracao frontend-backend confiavel.

## Observabilidade

### Logs estruturados

Eventos frequentes:

- server_started
- request_completed
- request_failed
- storage_bucket_setup_failed

### Request ID

Toda resposta inclui x-request-id.

Uso recomendado:

1. cliente envia x-request-id quando possivel
2. backend responde com o mesmo valor (ou gera um novo)
3. suporte cruza esse id entre logs de cliente, gateway e API

## Health check

### Endpoint

```bash
curl -i http://localhost:7200/health
```

### Comportamento

- 200 quando dependencias criticas estao saudaveis
- 503 quando banco ou storage falham
- em ambiente de teste automatizado, checks podem vir como skipped

### Payload de referencia

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "dependencies": {
      "database": {
        "status": "ok",
        "latencyMs": 3
      },
      "storage": {
        "status": "ok",
        "latencyMs": 8
      }
    }
  },
  "meta": {
    "apiVersion": "v1"
  }
}
```

## Incidentes comuns de integracao

### 401 em cascata nas rotas protegidas

Checar:

1. cliente envia Authorization Bearer corretamente
2. cliente executa refresh ao receber AUTH_INVALID_ACCESS_TOKEN
3. refresh nao falha com AUTH_INVALID_REFRESH_TOKEN
4. logout anterior nao revogou a sessao em uso

### /health retorna 503

Checar:

1. dependencies.database.status
2. dependencies.storage.status
3. latencias elevadas em dependency checks
4. logs com x-request-id correlato

### Upload falhando

Checar:

1. MIME permitido (jpeg, png, webp, gif)
2. tamanho <= 5MB
3. bucket disponivel no /health

### Erro em endpoints de IA

Checar:

1. `geminiApiKey` enviada no payload admin ou GEMINI_API_KEY presente no ambiente como fallback
2. quota disponivel no provedor
3. validade do modelo configurado
4. logs da API com x-request-id

Observacao: na V1, a chave Gemini deve ficar sob controle do admin. O playground pode salva-la no `localStorage` do navegador do admin para uso recorrente, mas o backend nao persiste essa chave.

### Playground admin com 302, 401 ou 403

Checar:

1. `POST /playground/session` foi chamado com `Authorization: Bearer <accessToken>`
2. resposta do bootstrap retornou `set-cookie` com `stackoverquiz_playground` e `HttpOnly`
3. browser esta enviando cookie na chamada `GET /playground/session`
4. conta realmente possui papel `admin` (role no banco)
5. sessao auth original nao foi revogada/expirada

Leitura rapida de sintomas:

- `302 /playground/app -> /playground`: sessao playground ausente ou invalida
- `401 /playground/session`: cookie ausente, expirado ou adulterado
- `403 /playground/session`: usuario autenticado sem role admin
- `302 /playground/app -> /playground/forbidden`: sessao existe, mas role admin nao e mais valida

## Configuracao critica para ambientes

### Producao

- DATABASE_URL e JWT_SECRET devem ser explicitos
- JWT_SECRET deve ter no minimo 32 caracteres
- com STORAGE_DRIVER=minio, MINIO_ACCESS_KEY e MINIO_SECRET_KEY devem ser explicitos e sem credenciais padrao
- com STORAGE_DRIVER=gcs, GCS_BUCKET deve ser explicito e a service account precisa de acesso ao bucket

### Google Cloud

- Terraform de homologacao fica em `terraform/`
- Cloud Run le `DATABASE_URL` e `JWT_SECRET` pelo Secret Manager
- Cloud SQL e acessado pelo socket `/cloudsql/<connection_name>` via `DATABASE_SOCKET_PATH`
- Uploads usam Google Cloud Storage quando `STORAGE_DRIVER=gcs`
- Enquanto OAuth state estiver em memoria, manter `max_instance_count=1` em homologacao ou persistir esse estado

### CORS

- CORS_ORIGINS aceita * ou lista separada por virgula
- cabecalhos permitidos: Content-Type e Authorization
- metodos permitidos: GET, POST, PUT, DELETE, PATCH

## CI e validacao continua

Pipeline recomendado:

1. bun run check
2. bun run typecheck
3. bun run test:db
4. docker build

## Suite local recomendada

```bash
bun run test
```

Esse fluxo inclui unit, integration e e2e com PostgreSQL temporario.

## Smoke de gate admin do playground

1. autenticar admin em `/v1/auth/login`
2. bootstrap de sessao em `POST /playground/session` com access token
3. abrir `/playground/app` com cookie `stackoverquiz_playground`
4. validar acesso a um asset protegido, por exemplo `/playground/assets/api-playground-core.js`
5. encerrar com `DELETE /playground/session`

## Operacoes de admin

### Bootstrap por seed (opcional)

```bash
SEED_ADMIN_ENABLED=true \
SEED_ADMIN_USERNAME=admin_local \
SEED_ADMIN_EMAIL=admin@example.com \
SEED_ADMIN_PASSWORD=use-uma-senha-forte-aqui \
bun run db:seed
```

### Criacao/promocao manual

```bash
bun run admin:create -- \
  --email admin@example.com \
  --username admin_local \
  --password "use-uma-senha-forte-aqui"
```

```bash
bun run admin:create -- --email usuario_existente@example.com
```

## Checklist de release

### Qualidade

- [ ] bun run check
- [ ] bun run typecheck
- [ ] bun run test
- [ ] bun run test:db

### Configuracao

- [ ] JWT_SECRET forte no ambiente alvo
- [ ] storage configurado (`MINIO_*` local ou `GCS_BUCKET` em Cloud Run)
- [ ] callbacks OAuth corretos
- [ ] CORS_ORIGINS revisado

### Banco

- [ ] impacto de schema revisado
- [ ] estrategia de migration validada
- [ ] backup disponivel para alteracoes sensiveis

### Smoke de contrato

- [ ] /health
- [ ] /v1/auth/login
- [ ] /v1/auth/refresh
- [ ] /v1/questions
- [ ] /v1/quizzes
- [ ] /playground/session (POST/GET/DELETE)
- [ ] /playground/app com sessao admin valida
- [ ] /v1/ai/generate e /v1/ai/generate-quiz
- [ ] /v1/admin/content/* (reviews de questions/quizzes)
- [ ] /v1/practice/* (questions flow e answer)

## Riscos conhecidos

- leaderboard de quiz ainda nao deduplica melhor tentativa por usuario
- estado OAuth em memoria ainda precisa estrategia para multi-instancia
- erros de provedor Gemini ainda podem evoluir para mensagens mais orientadas a UX
