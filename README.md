# 🧠 StackOverquiz

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Runtime: Bun](https://img.shields.io/badge/runtime-Bun-black.svg)](https://bun.sh)
[![Framework: Elysia](https://img.shields.io/badge/framework-Elysia-purple.svg)](https://elysiajs.com)

Backend REST API para plataformas de questionarios de programacao com integracao em qualquer frontend.

## Stack

- **Runtime**: Bun
- **Framework**: Elysia
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Storage**: MinIO local ou Google Cloud Storage em Cloud Run
- **IA**: Google Gemini
- **Auth**: JWT + OAuth2.0 (Google, GitHub)

## Quick Start

```bash
# 1. Copiar variáveis de ambiente
cp .env.example .env

# 2. Subir banco + MinIO
docker compose up -d db minio

# 3. Instalar dependências
bun install

# 4. Push schema para o banco
bun run db:push

# 5. Seed inicial (categorias sempre; admin apenas se configurado)
bun run db:seed

# 6. Dev server com hot reload
bun run dev
```

## Scripts

| Comando | Descrição |
|---|---|
| `bun run dev` | Dev server com hot reload |
| `bun run start` | Produção |
| `bun run test` | Suite completa: unit + integration + e2e com Postgres temporario |
| `bun run test:fast` | Unit + integration sem subir banco |
| `bun run test:unit` | Somente testes unitarios |
| `bun run test:integration` | Somente testes de integracao |
| `bun run test:e2e` | Base para testes E2E |
| `bun run test:db` | Sincroniza schema no banco de teste e roda integration + e2e |
| `bun run db:generate` | Gerar migrações |
| `bun run db:migrate` | Rodar migrações |
| `bun run db:push` | Push schema direto |
| `bun run db:seed` | Seed (categorias + admin opcional via `SEED_ADMIN_*`) |
| `bun run db:studio` | Drizzle Studio (GUI) |

## API Docs

Rodando a app diretamente com `bun run dev`:

- Swagger UI: `http://localhost:3000/swagger`
- Playground HTML: `http://localhost:3000/playground`
- Base da API: `http://localhost:3000/v1`

Rodando com `docker-compose.local.yml`:

- Swagger UI: `http://localhost:7200/swagger`
- Playground HTML: `http://localhost:7200/playground`
- Base da API: `http://localhost:7200/v1`

## Estado atual

Hoje o backend esta pronto para desenvolvimento serio e beta controlado. Os pontos mais importantes ja estao fechados:

- auth com access token, refresh rotativo e revogacao de sessao
- logout invalida imediatamente o access token da sessao revogada
- mudanca de senha pelo proprio usuario (revoga as outras sessoes) e reset de senha por admin
- acesso publico para navegar e responder perguntas/quizzes; criacao, edicao e XP exigem autenticacao
- payload publico sem gabarito exposto
- score calculado no backend com antifraude basica
- progressao por questao com 5 niveis de dificuldade, XP por dificuldade e tempo estimado por pergunta
- quizzes com composicao e tempo mais coerentes via duracao estimada e limite derivado automaticamente
- filtros `excludeAnswered=true` e `author=<id|me>` nas listagens de perguntas e quizzes
- leaderboard de quiz com deduplicacao da melhor tentativa por usuario
- moderacao com report unico por usuario
- comando operacional para criar ou promover admin
- playground visual para QA manual
- suite local automatizada com Postgres temporario

Documentacao detalhada em [`docs/`](./docs/README.md).

## Seed de Admin

O seed de categorias sempre roda. O seed de admin agora e opt-in.

Hoje o seed continua sendo de bootstrap: `categorias + admin opcional`.
Agora ele tambem documenta blueprints curatoriais de quiz, mas ainda nao sobe um banco curado de perguntas reais.
Se quisermos quizzes realmente coerentes por nivel, ainda vale criar um seed separado para banco curado de perguntas por categoria, dificuldade e blueprint.

Para bootstrapar um admin, defina no `.env`:

```bash
SEED_ADMIN_ENABLED=true
SEED_ADMIN_USERNAME=admin_local
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=use-uma-senha-forte-aqui
```

Em `production`, defina explicitamente `DATABASE_URL` e `JWT_SECRET`.
Se `STORAGE_DRIVER=minio`, defina tambem `MINIO_ACCESS_KEY` e `MINIO_SECRET_KEY` sem usar `minioadmin`.
Se `STORAGE_DRIVER=gcs`, defina `GCS_BUCKET` e rode a aplicacao com uma service account com acesso ao bucket.

## Admin operacional

Para o dia a dia, o caminho recomendado agora e o comando dedicado de admin.

### Criar um admin novo

```bash
bun run admin:create -- \
  --email admin@example.com \
  --username admin_local \
  --password "use-uma-senha-forte-aqui"
```

### Promover um usuario existente

```bash
bun run admin:create -- --email usuario_existente@example.com
```

Voce tambem pode localizar pelo username:

```bash
bun run admin:create -- --username usuario_existente
```

### Definir ou trocar senha local de um admin existente

```bash
bun run admin:create -- \
  --email admin@example.com \
  --password "nova-senha-forte-123"
```

Se estiver usando o ambiente dev em container:

```bash
docker compose -f docker-compose.local.yml exec app \
  bun run admin:create -- --email admin@example.com
```

## Docker (Full Stack)

```bash
docker compose up -d
```

Sobe: PostgreSQL + MinIO (console em `:9001`) + App (`:3000`)

## Google Cloud / Terraform

A base de homologacao em GCP fica em [`terraform/`](./terraform/):

- Cloud Run para a API
- Cloud SQL PostgreSQL
- Cloud Storage para uploads
- Artifact Registry para imagens Docker
- Secret Manager para `DATABASE_URL` e `JWT_SECRET`

O ambiente Cloud Run usa `STORAGE_DRIVER=gcs` e conexao Cloud SQL por socket em `/cloudsql`.
Veja [`terraform/README.md`](./terraform/README.md) para o fluxo de `terraform init`, `plan` e `apply`.

## Docker Dev

Para desenvolvimento local com bootstrap automatico de banco e seed:

```bash
docker compose -f docker-compose.local.yml up --build
```

Esse ambiente:

- sobe PostgreSQL e MinIO
- cria o bucket no MinIO
- roda `bun run db:push`
- roda `bun run db:seed`
- inicia a API em modo watch

Endpoints uteis:

- API: `http://localhost:7200/v1`
- Health: `http://localhost:7200/health`
- Swagger: `http://localhost:7200/swagger`
- PostgreSQL: `localhost:7201`
- MinIO API: `http://localhost:7202`
- MinIO Console: `http://localhost:7203`

Se alguma porta local ja estiver ocupada, voce pode sobrescrever antes de subir:

```bash
DEV_API_PORT=7300 DEV_DB_PORT=7301 DEV_MINIO_API_PORT=7302 DEV_MINIO_CONSOLE_PORT=7303 docker compose -f docker-compose.local.yml up --build
```

Para limpar tudo:

```bash
docker compose -f docker-compose.local.yml down -v
```

## Testing

Para rodar a base atual de testes localmente:

```bash
bun run test
```

Para uma passada mais rápida sem banco:

```bash
bun run test:fast
```

Se quiser controlar a porta do Postgres temporario usado pela suite completa:

```bash
TEST_DB_PORT=7214 bun run test
```

## Regras de progressao

- cada questao concede XP apenas na primeira vez em que o usuario a responde
- o XP da resposta correta varia conforme a dificuldade da pergunta
- refazer quiz com perguntas ja respondidas nao aumenta XP
- o bonus de quiz perfeito so entra quando todas as questoes daquele envio ainda eram ineditas para o usuario

Exemplos de filtro:

```bash
# Perguntas que ainda nao respondi
curl "http://localhost:7200/v1/questions?excludeAnswered=true" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN"

# Minhas proprias perguntas (inclui pending e rejected)
curl "http://localhost:7200/v1/questions?author=me" \
  -H "authorization: Bearer SEU_ACCESS_TOKEN"

# Perguntas de outro usuario (somente aprovadas)
curl "http://localhost:7200/v1/questions?author=USER_UUID"
```

## Estrutura

```
src/
├── config/          # env, database, storage
├── db/              # schema, migrations, seed
├── modules/
│   ├── auth/        # JWT, OAuth Google/GitHub, change-password
│   ├── questions/   # CRUD + filtros + moderacao
│   ├── quizzes/     # CRUD + attempts + leaderboard
│   ├── practice/    # Modo livre (questoes aleatorias + feedback imediato)
│   ├── categories/  # Listagem por tipo
│   ├── ratings/     # Avaliacao + reports
│   ├── uploads/     # Object storage images
│   ├── ai/          # Gemini generation (admin only)
│   ├── users/       # Perfil + stats + XP + PATCH /me
│   └── admin/       # Moderacao de content, categorias e users
├── shared/          # errors, pagination, types, health
└── plugins/         # swagger, cors
```
