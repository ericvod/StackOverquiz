locals {
  labels = {
    app         = "stackoverquiz"
    environment = var.environment
    managed_by  = "terraform"
  }

  artifact_repository_url = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repository_id}"
  container_image         = var.container_image != "" ? var.container_image : "${local.artifact_repository_url}/${var.image_name}:${var.image_tag}"
  bucket_name             = var.bucket_name != "" ? var.bucket_name : "${var.project_id}-soq-${var.environment}-uploads"
  database_url            = "postgres://${var.database_user}:${urlencode(random_password.database.result)}@localhost:5432/${google_sql_database.app.name}"
}

resource "google_project_service" "apis" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "iamcredentials.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "_-"
}

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "google_service_account" "cloud_run" {
  account_id   = "${var.environment}-stackoverquiz-run"
  display_name = "StackOverquiz ${var.environment} Cloud Run"
  description  = "Runtime identity for the StackOverquiz API on Cloud Run."

  depends_on = [google_project_service.apis]
}

resource "google_artifact_registry_repository" "api" {
  location      = var.region
  repository_id = var.artifact_repository_id
  description   = "StackOverquiz API Docker images"
  format        = "DOCKER"
  labels        = local.labels

  cleanup_policies {
    id     = "keep-recent-images"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_sql_database_instance" "postgres" {
  name                = "${var.environment}-stackoverquiz-postgres"
  database_version    = "POSTGRES_16"
  region              = var.region
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.database_tier
    availability_type = "ZONAL"
    disk_autoresize   = true
    disk_size         = var.database_disk_size_gb
    disk_type         = "PD_SSD"
    edition           = var.database_edition
    user_labels       = local.labels

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = false
      start_time                     = "03:00"
    }

    ip_configuration {
      ipv4_enabled = true
    }

    maintenance_window {
      day          = 7
      hour         = 4
      update_track = "stable"
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_sql_database" "app" {
  name     = var.database_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  name     = var.database_user
  instance = google_sql_database_instance.postgres.name
  password = random_password.database.result
}

resource "google_storage_bucket" "uploads" {
  name                        = local.bucket_name
  location                    = upper(var.region)
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = var.bucket_force_destroy
  labels                      = local.labels

  cors {
    origin          = var.storage_cors_origins
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "${var.environment}-stackoverquiz-database-url"
  labels    = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = local.database_url
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "${var.environment}-stackoverquiz-jwt-secret"
  labels    = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_storage_bucket_iam_member" "cloud_run_storage" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_artifact_registry_repository_iam_member" "cloud_run_artifact_reader" {
  project    = var.project_id
  location   = google_artifact_registry_repository.api.location
  repository = google_artifact_registry_repository.api.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_service_account_iam_member" "cloud_run_signer" {
  service_account_id = google_service_account.cloud_run.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_secret_manager_secret_iam_member" "cloud_run_database_url" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_secret_manager_secret_iam_member" "cloud_run_jwt_secret" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_cloud_run_v2_service" "api" {
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = var.deletion_protection
  labels              = local.labels

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count
    }

    volumes {
      name = "cloudsql"

      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }

    containers {
      image = local.container_image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }

        cpu_idle          = true
        startup_cpu_boost = true
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name = "DATABASE_URL"

        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "DATABASE_SOCKET_PATH"
        value = "/cloudsql/${google_sql_database_instance.postgres.connection_name}"
      }

      env {
        name = "JWT_SECRET"

        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "JWT_ACCESS_EXPIRY"
        value = var.jwt_access_expiry
      }

      env {
        name  = "JWT_REFRESH_EXPIRY"
        value = var.jwt_refresh_expiry
      }

      env {
        name  = "STORAGE_DRIVER"
        value = "gcs"
      }

      env {
        name  = "GCS_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.uploads.name
      }

      env {
        name  = "CORS_ORIGINS"
        value = var.cors_origins
      }

      env {
        name  = "GOOGLE_CLIENT_ID"
        value = var.google_client_id
      }

      env {
        name  = "GOOGLE_REDIRECT_URI"
        value = var.google_redirect_uri
      }

      env {
        name  = "GITHUB_CLIENT_ID"
        value = var.github_client_id
      }

      env {
        name  = "GITHUB_REDIRECT_URI"
        value = var.github_redirect_uri
      }

      env {
        name  = "SEED_ADMIN_ENABLED"
        value = "false"
      }
    }
  }

  depends_on = [
    google_artifact_registry_repository_iam_member.cloud_run_artifact_reader,
    google_project_iam_member.cloud_run_sql_client,
    google_secret_manager_secret_iam_member.cloud_run_database_url,
    google_secret_manager_secret_iam_member.cloud_run_jwt_secret,
    google_service_account_iam_member.cloud_run_signer,
    google_sql_database.app,
    google_sql_user.app,
    google_storage_bucket_iam_member.cloud_run_storage,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count = var.allow_unauthenticated ? 1 : 0

  name     = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
