# StackOverquiz GCP Staging

Terraform provisiona o ambiente oficial de homologacao no GCP:

- Cloud Run para a API Bun/Elysia
- Cloud SQL para PostgreSQL
- Cloud Storage para uploads
- Artifact Registry para imagens Docker
- Secret Manager para os secrets gerados em tempo de execucao

## Primeiro apply

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
gcloud auth application-default login
terraform init
terraform plan
```

Em um projeto novo, provisione primeiro as APIs e o repositorio do Artifact Registry
para que o repositorio Docker esteja disponivel antes de o Cloud Run tentar subir a imagem:

```bash
terraform apply \
  -target=google_project_service.apis \
  -target=google_artifact_registry_repository.api
```

Faca o build e o push da imagem da aplicacao. Prefira uma tag nova a cada deploy
para que o Terraform crie uma nova revisao do Cloud Run em vez de reutilizar a mesma referencia:

```bash
docker build -t us-central1-docker.pkg.dev/PROJECT_ID/stackoverquiz-api/api:TAG ..
gcloud auth configure-docker us-central1-docker.pkg.dev
docker push us-central1-docker.pkg.dev/PROJECT_ID/stackoverquiz-api/api:TAG
```

Em seguida, aplique a infraestrutura completa:

```bash
terraform apply
```

A aplicacao se conecta ao Cloud SQL via socket `/cloudsql` no Cloud Run
e acessa o Google Cloud Storage por Application Default Credentials.

## Secrets

O Terraform gera e armazena automaticamente:

- `DATABASE_URL`
- `JWT_SECRET`

Ambos sao injetados no Cloud Run diretamente do Secret Manager. Secrets opcionais
de providers externos — como chaves da API Gemini e client secrets de OAuth —
devem ser adicionados separadamente antes de habilitar esses fluxos no ambiente de homologacao.

## Observacoes

O tier padrao do Cloud SQL e `db-f1-micro`, adequado para staging de baixo trafego.
Instancias shared-core exigem a edicao `ENTERPRISE` e sao economicas, mas nao sao o alvo de producao.

`max_instance_count` padrao e `1` porque o estado OAuth e mantido em memoria no processo.
Aumente esse valor apos migrar o estado OAuth para armazenamento persistente.

Mantenha `terraform.tfvars` e `*.tfstate` fora do controle de versao — podem conter
valores especificos do projeto e secrets gerados.
