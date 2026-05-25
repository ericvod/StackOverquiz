output "cloud_run_url" {
  description = "Public Cloud Run service URL."
  value       = google_cloud_run_v2_service.api.uri
}

output "cloud_run_service_account_email" {
  description = "Runtime service account used by Cloud Run."
  value       = google_service_account.cloud_run.email
}

output "artifact_repository_url" {
  description = "Artifact Registry Docker repository URL."
  value       = local.artifact_repository_url
}

output "container_image" {
  description = "Container image URL configured on Cloud Run."
  value       = local.container_image
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL instance connection name used by Cloud Run."
  value       = google_sql_database_instance.postgres.connection_name
}

output "database_name" {
  description = "Application database name."
  value       = google_sql_database.app.name
}

output "database_user" {
  description = "Application database user."
  value       = google_sql_user.app.name
}

output "database_password" {
  description = "Generated database password. Prefer Secret Manager for runtime access."
  value       = random_password.database.result
  sensitive   = true
}

output "database_url" {
  description = "Generated database URL stored in Secret Manager."
  value       = local.database_url
  sensitive   = true
}

output "database_url_secret_id" {
  description = "Secret Manager secret id containing DATABASE_URL."
  value       = google_secret_manager_secret.database_url.secret_id
}

output "jwt_secret_secret_id" {
  description = "Secret Manager secret id containing JWT_SECRET."
  value       = google_secret_manager_secret.jwt_secret.secret_id
}

output "storage_bucket_name" {
  description = "GCS bucket used for uploads."
  value       = google_storage_bucket.uploads.name
}
