.PHONY: install-hooks docker-local-up docker-local-up-build docker-local-down

install-hooks:
	pre-commit install
	pre-commit install --hook-type pre-push
	@echo "✓ commit + pre-push hook'ları kuruldu"

docker-local-up:
	docker compose -f docker/docker-compose.yml --profile celery up -d

docker-local-up-build:
	docker compose -f docker/docker-compose.yml --profile celery up --build -d

docker-local-down:
	docker compose -f docker/docker-compose.yml --profile celery down
