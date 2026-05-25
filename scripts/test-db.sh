#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${TEST_COMPOSE_FILE:-$PROJECT_ROOT/docker-compose.test.yml}"
COMPOSE_PROJECT_NAME="${TEST_COMPOSE_PROJECT:-stackoverquiz-test-runner}"
TEST_DB_PORT="${TEST_DB_PORT:-7204}"
TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgres://postgres:postgres@localhost:${TEST_DB_PORT}/stackoverquiz_test}"
TEST_DB_SERVICE="${TEST_DB_SERVICE:-db}"
STARTUP_TIMEOUT_SECONDS="${TEST_DB_TIMEOUT_SECONDS:-45}"

cleanup() {
  docker compose \
    -p "$COMPOSE_PROJECT_NAME" \
    -f "$COMPOSE_FILE" \
    --profile test \
    down -v --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "Running unit tests..."
cd "$PROJECT_ROOT"
bun run test:unit

echo "Starting isolated PostgreSQL test container on port ${TEST_DB_PORT}..."
docker compose \
  -p "$COMPOSE_PROJECT_NAME" \
  -f "$COMPOSE_FILE" \
  up -d "$TEST_DB_SERVICE"

CONTAINER_ID="$(
  docker compose \
    -p "$COMPOSE_PROJECT_NAME" \
    -f "$COMPOSE_FILE" \
    ps -q "$TEST_DB_SERVICE"
)"

if [[ -z "$CONTAINER_ID" ]]; then
  echo "Could not determine the test database container id." >&2
  exit 1
fi

echo "Waiting for PostgreSQL test container to become healthy..."
DEADLINE=$((SECONDS + STARTUP_TIMEOUT_SECONDS))

while (( SECONDS < DEADLINE )); do
  HEALTH_STATUS="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CONTAINER_ID" 2>/dev/null || true)"

  if [[ "$HEALTH_STATUS" == "healthy" ]]; then
    echo "PostgreSQL test container is healthy."
    break
  fi

  if [[ "$HEALTH_STATUS" == "exited" || "$HEALTH_STATUS" == "dead" ]]; then
    echo "PostgreSQL test container exited unexpectedly." >&2
    docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" logs "$TEST_DB_SERVICE" || true
    exit 1
  fi

  sleep 1
done

if [[ "${HEALTH_STATUS:-}" != "healthy" ]]; then
  echo "Timed out waiting for PostgreSQL test container to become healthy." >&2
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" logs "$TEST_DB_SERVICE" || true
  exit 1
fi

echo "Running integration and E2E tests with database..."
TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_DB_PORT="$TEST_DB_PORT" bun run test:db
