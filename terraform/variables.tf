variable "project_id" {
  description = "Google Cloud project id that will host the staging infrastructure."
  type        = string
}

variable "region" {
  description = "Google Cloud region for Cloud Run, Cloud SQL, Artifact Registry and the regional GCS bucket."
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment label used in resource names."
  type        = string
  default     = "staging"
}

variable "service_name" {
  description = "Cloud Run service name."
  type        = string
  default     = "stackoverquiz-api"
}

variable "artifact_repository_id" {
  description = "Artifact Registry Docker repository id."
  type        = string
  default     = "stackoverquiz-api"
}

variable "image_name" {
  description = "Docker image name inside Artifact Registry."
  type        = string
  default     = "api"
}

variable "image_tag" {
  description = "Docker image tag used when container_image is not explicitly set."
  type        = string
  default     = "staging"
}

variable "container_image" {
  description = "Full container image URL. When empty, Terraform derives the URL from Artifact Registry variables."
  type        = string
  default     = ""
}

variable "database_name" {
  description = "Application database name."
  type        = string
  default     = "stackoverquiz"
}

variable "database_user" {
  description = "Application database user."
  type        = string
  default     = "postgres"
}

variable "database_tier" {
  description = "Cloud SQL machine tier. db-f1-micro is intentionally cheap for staging."
  type        = string
  default     = "db-f1-micro"
}

variable "database_edition" {
  description = "Cloud SQL edition. ENTERPRISE supports shared-core tiers such as db-f1-micro."
  type        = string
  default     = "ENTERPRISE"
}

variable "database_disk_size_gb" {
  description = "Initial Cloud SQL disk size in GB."
  type        = number
  default     = 10
}

variable "bucket_name" {
  description = "Optional globally unique GCS bucket name. Leave empty to derive one from project/service/environment."
  type        = string
  default     = ""
}

variable "bucket_force_destroy" {
  description = "Whether Terraform may delete non-empty upload buckets. Keep false outside disposable environments."
  type        = bool
  default     = false
}

variable "storage_cors_origins" {
  description = "Allowed origins for browser reads from signed GCS URLs."
  type        = list(string)
  default     = ["*"]
}

variable "cors_origins" {
  description = "CORS_ORIGINS value for the API itself. Use a comma-separated list or *."
  type        = string
  default     = "*"
}

variable "cloud_run_cpu" {
  description = "Cloud Run CPU limit."
  type        = string
  default     = "1"
}

variable "cloud_run_memory" {
  description = "Cloud Run memory limit."
  type        = string
  default     = "512Mi"
}

variable "min_instance_count" {
  description = "Minimum Cloud Run instances. Zero keeps scale-to-zero."
  type        = number
  default     = 0
}

variable "max_instance_count" {
  description = "Maximum Cloud Run instances. Keep low for staging and OAuth state while it remains in memory."
  type        = number
  default     = 1
}

variable "allow_unauthenticated" {
  description = "Whether the Cloud Run API is publicly invokable."
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Enable deletion protection on Cloud SQL and Cloud Run resources."
  type        = bool
  default     = false
}

variable "jwt_access_expiry" {
  description = "JWT access token expiry."
  type        = string
  default     = "15m"
}

variable "jwt_refresh_expiry" {
  description = "JWT refresh token expiry."
  type        = string
  default     = "7d"
}

variable "google_client_id" {
  description = "Optional Google OAuth client id."
  type        = string
  default     = ""
}

variable "google_redirect_uri" {
  description = "Optional Google OAuth redirect URI."
  type        = string
  default     = ""
}

variable "github_client_id" {
  description = "Optional GitHub OAuth client id."
  type        = string
  default     = ""
}

variable "github_redirect_uri" {
  description = "Optional GitHub OAuth redirect URI."
  type        = string
  default     = ""
}
