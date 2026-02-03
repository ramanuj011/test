.PHONY: build up down logs

build:
	docker compose build

up:
	docker compose up -d --build

down:
	docker compose down --remove-orphans

logs:
	docker compose logs -f
