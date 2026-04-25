.PHONY: dev up down logs shell migrate migrate-dev build db-studio worker

dev:
	npm run dev

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

shell:
	docker compose exec app sh

migrate:
	npx prisma migrate deploy

migrate-dev:
	npx prisma migrate dev

build:
	docker compose build

db-studio:
	npx prisma studio

worker:
	node_modules/.bin/tsx worker.js
