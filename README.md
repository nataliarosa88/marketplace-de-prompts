# PromptVault

Projeto fullstack simples com:
- Frontend: React + Next.js + TypeScript
- Backend: Java + Spring Boot
- Banco: PostgreSQL
- Orquestracao: Docker Compose

## Estrutura

- `frontend`: UI, logica e data fetching separados
- `backend`: camadas `controller`, `service` e `repository`
- `docker-compose.yml`: sobe frontend, backend e banco

## Rodando localmente

### 1) Backend

```bash
cd backend
mvn spring-boot:run
```

API em `http://localhost:8080/api/prompts`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

App em `http://localhost:3000`.

Para build de export estatico:

```bash
npm run build
```

Configurado em `next.config.ts` com `output: "export"` e `distDir: "dist"`.

## Rodando com Docker Compose

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

## Testes

Frontend (unitarios):

```bash
cd frontend
npm test
```
