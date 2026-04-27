<div align="center">

# Marketplace de Prompts

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=springboot)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker_Compose-ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

**Catálogo colaborativo de prompts com moderação e URL secreta de administração (sem login de usuário).**

</div>

---

## Execução Rápida com Docker

```bash
# 1. Suba tudo
docker compose up --build -d

# 2. Acesse
# Frontend  → http://localhost:3000
# Backend   → http://localhost:8080
# Banco     → localhost:5432

# 3. Para encerrar
docker compose down
```

### URL secreta de admin

- O backend valida o segredo via `ADMIN_SECRET` (default `change-me`).
- No frontend, o painel admin fica em:
  - `http://localhost:3000/s/?secret=<SEU_ADMIN_SECRET>`
- O mesmo valor é usado nas rotas:
  - `/api/s/{SECRET}/admin/prompts/...`
  - `/api/s/{SECRET}/admin/llms/...`

> Em produção, use um segredo forte e trate a URL como credencial.

---

## Índice

- [Visão Geral](#visão-geral)
- [Arquitetura C4](#arquitetura-c4)
- [Fluxo de Prompts e Moderação](#fluxo-de-prompts-e-moderação)
- [Diagrama de Sequência — Criação de Prompt](#diagrama-de-sequência--criação-de-prompt)
- [Diagrama de Sequência — Moderação Admin (URL Secreta)](#diagrama-de-sequência--moderação-admin-url-secreta)
- [Modelo de Dados](#modelo-de-dados)
- [API Principal](#api-principal)
- [Funcionalidades](#funcionalidades)
- [Agente Revisor Local](#agente-revisor-local)
- [Validações e Regras de Negócio](#validações-e-regras-de-negócio)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Troubleshooting](#troubleshooting)
- [Release Notes](#release-notes)

---

## Visão Geral

O **Marketplace de Prompts** é um catálogo vivo — não uma lista estática. Ele combina:

| Pilar | O que entrega |
|-------|--------------|
| **Descoberta** | Busca textual, filtro por categoria, autocomplete e paginação |
| **Criação** | Formulário com revisor em tempo real e campo de e-mail obrigatório |
| **Moderação** | Fila de aprovação via URL secreta de admin |
| **Segurança Operacional** | Segredo em `ADMIN_SECRET`, sem login/JWT de usuário |
| **Métricas** | Contador de cópias por prompt |

---

## Arquitetura C4

### Nível 1 — Contexto do Sistema

```mermaid
graph TB
    U([Usuário\nCria, busca e copia prompts])
    A([Administrador\nAcessa URL secreta para moderação])
    MP[["Marketplace de Prompts\nCatálogo colaborativo com moderação"]]

    U -->|Usa via navegador| MP
    A -->|Usa URL secreta| MP
```

---

### Nível 2 — Containers

```mermaid
graph TB
    U([Usuário/Admin\nNavegador])

    subgraph Sistema["Marketplace de Prompts"]
        FE["Frontend\nNext.js · React · TypeScript"]
        BE["Backend API\nSpring Boot · Java · REST"]
        DB[("PostgreSQL 16")]
    end

    U -->|"HTTP :3000"| FE
    FE -->|"REST JSON :8080"| BE
    BE -->|"JPA / Hibernate :5432"| DB
```

---

### Nível 3 — Componentes do Backend

```mermaid
graph TB
    subgraph Backend["Backend — Spring Boot"]
        direction TB

        subgraph Controllers["Controllers (HTTP)"]
            PC["PromptController"]
            PMC["PromptModerationController\nrota /api/s/{secret}/admin/prompts"]
            LMC["LlmModelController"]
            ALMC["AdminLlmController\nrota /api/s/{secret}/admin/llms"]
        end

        subgraph Services["Services"]
            PS["PromptService"]
            ASG["AdminSecretGuard"]
        end

        subgraph Repositories["Repositories"]
            PR["PromptRepository"]
            LR["LlmModelRepository"]
        end
    end

    DB[("PostgreSQL")]

    PC --> PS
    PMC --> PS
    PMC --> ASG
    ALMC --> ASG
    PS --> PR
    LMC --> LR
    ALMC --> LR
    PR --> DB
    LR --> DB
```

---

## Fluxo de Prompts e Moderação

```mermaid
flowchart TD
    A[Usuário cria prompt com email] --> B[POST /api/prompts]
    B --> C[Prompt entra pendente]
    C --> D[Admin acessa /s/?secret=...]
    D --> E{Revisão}
    E -->|Aprovar| F[authorizedAt preenchido]
    E -->|Reprovar| G[deletedAt preenchido]
    F --> H[Prompt aparece no feed público]
```

---

## Diagrama de Sequência — Criação de Prompt

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant FE as Frontend
    participant REV as RevisorLocal
    participant BE as Backend
    participant DB as PostgreSQL

    U->>FE: Abre formulário e preenche título/corpo/email
    FE->>REV: Analisa texto em tempo real
    REV-->>FE: Dicas de melhoria
    U->>FE: Envia formulário
    FE->>BE: POST /api/prompts
    BE->>BE: Valida campos (email, desc, obrigatórios)
    BE->>DB: INSERT prompt (authorizedAt null)
    DB-->>BE: Prompt salvo como pendente
    BE-->>FE: 201 Created
```

---

## Diagrama de Sequência — Moderação Admin (URL Secreta)

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant FE as FrontendSecretPage
    participant BE as Backend
    participant DB as PostgreSQL

    A->>FE: Abre /s/?secret=XYZ
    FE->>BE: GET /api/s/XYZ/admin/prompts/pending
    BE->>BE: AdminSecretGuard compara XYZ com ADMIN_SECRET
    BE->>DB: Busca pendentes
    DB-->>BE: Lista pendentes
    BE-->>FE: 200

    A->>FE: Aprovar prompt
    FE->>BE: POST /api/s/XYZ/admin/prompts/{id}/approve
    BE->>DB: UPDATE authorizedAt
    BE-->>FE: 200
```

---

## Modelo de Dados

```mermaid
erDiagram
    PROMPT {
        uuid id PK
        string title
        text body
        string author "email do criador"
        string description
        string model
        int copies
        timestamp created_at
        timestamp updated_at
        timestamp authorized_at "NULL = pendente"
        timestamp deleted_at "NULL = oculto/reprovado"
    }

    LLM_MODEL {
        uuid id PK
        string name
        boolean active
    }
```

> `authorized_at = NULL` indica prompt pendente de moderação.  
> `deleted_at != NULL` indica soft delete.

---

## API Principal

**Base URL:** `http://localhost:8080`

### Prompts

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/prompts` | Lista prompts aprovados e ativos |
| `POST` | `/api/prompts` | Cria novo prompt pendente (inclui `email`) |
| `POST` | `/api/prompts/{id}/copy` | Incrementa contador de cópias |

### Moderação (URL secreta)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/s/{SECRET}/admin/prompts/pending` | Lista prompts pendentes |
| `POST` | `/api/s/{SECRET}/admin/prompts/{id}/approve` | Aprova prompt |
| `POST` | `/api/s/{SECRET}/admin/prompts/{id}/reject` | Reprova prompt |

### LLMs

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/llms` | Lista LLMs ativas para uso no formulário |
| `GET` | `/api/s/{SECRET}/admin/llms` | Lista todas as LLMs (admin) |
| `POST` | `/api/s/{SECRET}/admin/llms` | Cadastra LLM |
| `DELETE` | `/api/s/{SECRET}/admin/llms/{id}` | Remove ou inativa LLM |

---

## Funcionalidades

### Público geral

- Busca textual em tempo real
- Filtro por categoria/tag com autocomplete
- Paginação da listagem
- Tema claro/escuro
- Criação de prompt com email e moderação
- Copiar prompt com contador
- Expansão de cards e modal de visualização

### Painel admin secreto

- Aprovação/reprovação de prompts pendentes
- Cadastro e inativação de LLMs

---

## Agente Revisor Local

O revisor analisa o prompt **100% no frontend**, sem chamadas externas ou chave de API.

```mermaid
flowchart LR
    A[Usuario digita prompt] --> B[RevisorLocal regex]
    B --> C{Analise}
    C --> D[Titulo incompleto]
    C --> E[Descricao curta]
    C --> F[Sem verbo de acao]
    C --> G[Sem contexto]
    C --> H[Sem formato de saida]
    D --> I[Dicas em tempo real]
    E --> I
    F --> I
    G --> I
    H --> I
```

---

## Validações e Regras de Negócio

| Regra | Escopo |
|-------|--------|
| Título obrigatório | Frontend + Backend |
| Corpo obrigatório | Frontend + Backend |
| Descrição curta obrigatória (`desc`) | Frontend + Backend |
| Email válido (`@Email`) | Frontend + Backend |
| Prompt criado entra pendente (`authorizedAt = null`) | Backend |
| Cópia só para prompt aprovado e ativo | Backend |
| Segredo inválido retorna `HTTP 403` nas rotas admin | Backend |

---

## Desenvolvimento Local

### Backend

```bash
cd backend
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/promptvault
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=postgres
export ADMIN_SECRET=change-me
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8080/api
npm run dev
```

### Testes

```bash
cd backend && ./mvnw test
cd frontend && npm test
```

**Fluxo de validação manual recomendado:**

1. Criar prompt com email válido
2. Verificar que não aparece no feed antes da aprovação
3. Acessar `/s/?secret=...`
4. Aprovar/reprovar prompt
5. Validar listagem pública após aprovação
6. Validar cadastro/inativação de LLM

---

## Estrutura do Repositório

```text
prompt-vault/
├── frontend/           # Next.js + React + TypeScript
│   ├── src/
│   │   ├── app/        # rotas (/, /s)
│   │   ├── components/
│   │   ├── context/
│   │   └── data/
│   └── Dockerfile
│
├── backend/            # Spring Boot + Java
│   ├── src/main/java/
│   │   ├── prompt/
│   │   ├── llm/
│   │   ├── admin/
│   │   └── config/
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Troubleshooting

### Fluxo de Diagnóstico

```mermaid
flowchart TD
    Start[Algo nao funciona] --> A{Qual servico}
    A -->|Frontend| FE[Ver logs frontend]
    A -->|Backend| BE[Ver logs backend]
    A -->|Banco| DB[Ver logs postgres]
    FE --> X1[Checar rota /s/ com barra]
    BE --> X2[Checar ADMIN_SECRET]
    DB --> X3[Checar conexao]
```

---

### Docker — Diagnóstico Geral

```bash
docker compose ps
docker compose logs -f
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f postgres
```

---

### Frontend — Diagnóstico

```bash
docker compose logs -f frontend
curl -I http://localhost:3000/
curl -I "http://localhost:3000/s/?secret=change-me"
```

Erros comuns:

| Erro | Causa provável | Solução |
|------|----------------|---------|
| `This page could not be found` em `/s` | Acesso sem barra final | Use `/s/?secret=...` |
| Painel sem dados | `secret` errado | Confirmar `ADMIN_SECRET` no backend |
| `ECONNREFUSED 8080` | Backend fora | Reiniciar backend |

---

### Backend — Diagnóstico

```bash
docker compose logs -f backend
curl -v http://localhost:8080/api/prompts
curl -v "http://localhost:8080/api/s/change-me/admin/prompts/pending"
```

Erros comuns:

| Erro / Log | Causa provável | Solução |
|------------|----------------|---------|
| `403 Sem permissao` | Secret incorreto | Usar mesmo valor do `ADMIN_SECRET` |
| `Could not resolve placeholder` | Env faltando | Definir `ADMIN_SECRET` |
| `Port 8080 already in use` | Porta ocupada | Liberar porta ou alterar mapeamento |

---

### Banco de Dados — Diagnóstico

```bash
docker compose exec postgres psql -U postgres -d promptvault
```

```sql
\dt
SELECT id, title, author, authorized_at, deleted_at FROM prompts ORDER BY created_at DESC;
```

---

### Checklist de Diagnóstico Rápido

```text
1. docker compose ps
2. docker compose logs --tail=50 frontend
3. docker compose logs --tail=50 backend
4. curl http://localhost:8080/api/prompts
5. abrir /s/?secret=<ADMIN_SECRET>
```

---

## Release Notes

```mermaid
timeline
    title Linha do Tempo de Desenvolvimento

    section Base
        Estrutura inicial : Next.js + Spring Boot + PostgreSQL
        Docker Compose : frontend + backend + banco

    section Moderacao
        Fluxo pendente : approved/deleted timestamps
        Painel secreto : /s/?secret=...

    section Atual
        Remocao de login : sem JWT para usuario final
        Email no prompt : identificacao de autoria
        Admin por segredo : ADMIN_SECRET no backend
```

---

*Para novos colaboradores: comece por Execução Rápida, Fluxo de Moderação e API Principal.*
