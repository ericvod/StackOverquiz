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

## Deploy no GCP

### Pre-requisitos

- [gcloud CLI](https://cloud.google.com/sdk/docs/install) instalado e autenticado
- Docker instalado e rodando
- Terraform >= 1.6.0 instalado
- Projeto GCP criado com billing ativo
- Permissoes de Owner ou Editor no projeto GCP

### Primeira vez — infraestrutura nova

#### 1. Configurar variaveis do Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Editar `terraform.tfvars` com os valores do projeto:

```hcl
project_id  = "SEU_PROJECT_ID"
region      = "us-central1"
environment = "staging"
image_tag   = "v1.0.0"
```

#### 2. Autenticar e inicializar

```bash
gcloud auth application-default login
terraform init
```

#### 3. Provisionar APIs e Artifact Registry primeiro

Em um projeto novo, o repositorio Docker precisa existir antes de o Cloud Run
tentar referenciar uma imagem:

```bash
terraform apply \
  -target=google_project_service.apis \
  -target=google_artifact_registry_repository.api
```

Confirme com `yes` quando solicitado.

#### 4. Build e push da imagem

Substituir `SEU_PROJECT_ID` e a tag desejada:

```bash
cd ..

# Autenticar Docker no Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build da imagem de producao
docker build -t us-central1-docker.pkg.dev/SEU_PROJECT_ID/stackoverquiz-api/api:v1.0.0 .

# Push para o Artifact Registry
docker push us-central1-docker.pkg.dev/SEU_PROJECT_ID/stackoverquiz-api/api:v1.0.0
```

#### 5. Aplicar infraestrutura completa

```bash
cd terraform
terraform apply
```

O Terraform vai criar e configurar:

- Cloud SQL PostgreSQL com senha gerada automaticamente
- JWT_SECRET gerado e armazenado no Secret Manager
- Cloud Storage com acesso privado (signed URLs)
- Cloud Run apontando para a imagem recem enviada
- Service account com IAM minimo necessario

Ao final, o output `cloud_run_url` exibe a URL publica da API.

#### 6. Verificar o deploy

```bash
curl https://SEU_CLOUD_RUN_URL/health
```

Resposta esperada com `"status": "ok"` e dependencias `database` e `storage` saudaveis.
Migracoes rodam automaticamente na inicializacao do container (`db:migrate:prod && start`).

#### 7. Criar o primeiro admin

O Terraform nao cria usuarios. Para o primeiro acesso ao playground:

```bash
gcloud run jobs create create-admin \
  --image us-central1-docker.pkg.dev/SEU_PROJECT_ID/stackoverquiz-api/api:v1.0.0 \
  --region us-central1 \
  --set-cloudsql-instances SEU_PROJECT_ID:us-central1:staging-stackoverquiz-postgres \
  --set-secrets DATABASE_URL=staging-stackoverquiz-database-url:latest \
  --set-env-vars DATABASE_SOCKET_PATH=/cloudsql/SEU_PROJECT_ID:us-central1:staging-stackoverquiz-postgres \
  --set-env-vars NODE_ENV=production \
  --command "bun" \
  --args "run,admin:create,--,--email,admin@example.com,--username,admin,--password,senha-forte-aqui" \
  --service-account staging-stackoverquiz-run@SEU_PROJECT_ID.iam.gserviceaccount.com

gcloud run jobs execute create-admin --region us-central1 --wait
```

Apos confirmar a criacao, remover o job:

```bash
gcloud run jobs delete create-admin --region us-central1
```

### Secrets opcionais

Gemini, Google OAuth e GitHub OAuth nao sao gerenciados pelo Terraform.
Para habilitar cada um, adicionar o secret no Secret Manager e expor no Cloud Run:

#### Gemini API

```bash
echo -n "SUA_GEMINI_KEY" | \
  gcloud secrets create staging-stackoverquiz-gemini-key \
    --data-file=- --replication-policy=automatic

gcloud secrets add-iam-policy-binding staging-stackoverquiz-gemini-key \
  --member="serviceAccount:staging-stackoverquiz-run@SEU_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud run services update stackoverquiz-api \
  --region us-central1 \
  --update-secrets GEMINI_API_KEY=staging-stackoverquiz-gemini-key:latest
```

#### Google OAuth

```bash
echo -n "SEU_GOOGLE_CLIENT_SECRET" | \
  gcloud secrets create staging-stackoverquiz-google-client-secret \
    --data-file=- --replication-policy=automatic

gcloud secrets add-iam-policy-binding staging-stackoverquiz-google-client-secret \
  --member="serviceAccount:staging-stackoverquiz-run@SEU_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud run services update stackoverquiz-api \
  --region us-central1 \
  --update-secrets GOOGLE_CLIENT_SECRET=staging-stackoverquiz-google-client-secret:latest
```

Repetir o mesmo padrao para `GITHUB_CLIENT_SECRET`.

---

### Deploys subsequentes

Para cada nova versao, apenas o build, push e atualizacao da tag sao necessarios:

```bash
# 1. Build e push com nova tag
docker build -t us-central1-docker.pkg.dev/SEU_PROJECT_ID/stackoverquiz-api/api:v1.1.0 .
docker push us-central1-docker.pkg.dev/SEU_PROJECT_ID/stackoverquiz-api/api:v1.1.0

# 2. Atualizar a tag no tfvars
# Editar terraform/terraform.tfvars: image_tag = "v1.1.0"

# 3. Aplicar
cd terraform
terraform apply
```

O Cloud Run cria uma nova revisao automaticamente. Migracoes rodam na
inicializacao do novo container antes de a API comecar a servir trafego.

### Obter a URL do servico a qualquer momento

```bash
terraform output cloud_run_url
```

Ou diretamente pelo gcloud:

```bash
gcloud run services describe stackoverquiz-api \
  --region us-central1 \
  --format="value(status.url)"
```

### Destruir o ambiente

```bash
cd terraform
terraform destroy
```

Atencao: `deletion_protection = false` no tfvars de staging permite que o Terraform
remova o Cloud SQL. Para producao, manter `deletion_protection = true`.

---

## Riscos conhecidos

- leaderboard de quiz ainda nao deduplica melhor tentativa por usuario
- estado OAuth em memoria ainda precisa estrategia para multi-instancia
- erros de provedor Gemini ainda podem evoluir para mensagens mais orientadas a UX
