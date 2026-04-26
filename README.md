<div align="center">

# Marketplace de Prompts

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=springboot)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker_Compose-ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT-F7B731?style=for-the-badge&logo=jsonwebtokens)](https://jwt.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

**Catálogo colaborativo de prompts com moderação, autenticação e foco total em produtividade.**

</div>

---

## Execução Rápida com Docker

```bash
# 1. Clone e suba tudo com um comando
docker compose up --build -d

# 2. Acesse
# Frontend  → http://localhost:3000
# Backend   → http://localhost:8080
# Banco     → localhost:5432

# 3. Para encerrar
docker compose down
```

> **Credencial admin seed:** `admin@admin.com` / `admin`

---

## Índice

- [Visão Geral](#visão-geral)
- [Arquitetura C4](#arquitetura-c4)
- [Fluxo de Autenticação](#fluxo-de-autenticação)
- [Fluxo de Prompts e Moderação](#fluxo-de-prompts-e-moderação)
- [Diagrama de Sequência — Criação de Prompt](#diagrama-de-sequência--criação-de-prompt)
- [Diagrama de Sequência — Moderação Admin](#diagrama-de-sequência--moderação-admin)
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
| **Criação** | Formulário com revisor em tempo real (sem API externa) |
| **Moderação** | Fila de aprovação com controle admin |
| **Segurança** | JWT + roles (`USER` / `ADMIN`) + ownership por autor |
| **Métricas** | Contador de cópias por prompt |

---

## Arquitetura C4

### Nível 1 — Contexto do Sistema

```mermaid
graph TB
    U([Usuário\nCria, busca e copia prompts])
    A([Administrador\nModera e gerencia usuários])
    MP[["Marketplace de Prompts\n─────────────────────\nCatálogo colaborativo de prompts\ncom autenticação e moderação"]]

    U -->|Usa via navegador| MP
    A -->|Administra via navegador| MP

    style MP fill:#1e40af,color:#fff,stroke:#1e3a8a
    style U fill:#374151,color:#fff,stroke:#111827
    style A fill:#374151,color:#fff,stroke:#111827
```

---

### Nível 2 — Containers

```mermaid
graph TB
    U([Usuário / Admin\nNavegador])

    subgraph Sistema["Marketplace de Prompts"]
        FE["Frontend\n─────────────────\nNext.js · React · TypeScript\nContextos de Auth e Prompt"]
        BE["Backend API\n─────────────────\nSpring Boot · Java\nREST · JWT · Regras de negócio"]
        DB[("Banco de Dados\n─────────────────\nPostgreSQL 16\nUsuários · Prompts · Metadados")]
    end

    U -->|"HTTPS :3000"| FE
    FE -->|"REST JSON :8080"| BE
    BE -->|"JPA / Hibernate :5432"| DB

    style FE fill:#0f766e,color:#fff,stroke:#0d9488
    style BE fill:#1e40af,color:#fff,stroke:#1d4ed8
    style DB fill:#374151,color:#fff,stroke:#111827
    style Sistema fill:#f8fafc,stroke:#e2e8f0
```

---

### Nível 3 — Componentes do Backend

```mermaid
graph TB
    subgraph Backend["Backend — Spring Boot"]
        direction TB

        subgraph Controllers["Controllers (HTTP)"]
            AC["AuthController\nLogin · Registro"]
            PC["PromptController\nCRUD de prompts"]
            ADC["AdminController\nModeração · Papéis"]
        end

        subgraph Services["Services (Regras de negócio)"]
            AS["AuthService\nJWT · Validação"]
            PS["PromptService\nOwnership · Moderação"]
            ADS["AdminService\nAprovação · Usuários"]
        end

        subgraph Repositories["Repositories (JPA)"]
            PR["PromptRepository"]
            UR["UserRepository"]
        end

        SEC["SecurityConfig\nFiltro JWT · CORS · Autorização por role"]
    end

    DB[("PostgreSQL")]

    AC --> AS
    PC --> PS
    ADC --> ADS
    AS --> UR
    PS --> PR
    ADS --> PR
    ADS --> UR
    PR --> DB
    UR --> DB
    SEC -.->|protege| Controllers

    style AC fill:#7c3aed,color:#fff,stroke:#6d28d9
    style PC fill:#7c3aed,color:#fff,stroke:#6d28d9
    style ADC fill:#7c3aed,color:#fff,stroke:#6d28d9
    style AS fill:#1e40af,color:#fff,stroke:#1d4ed8
    style PS fill:#1e40af,color:#fff,stroke:#1d4ed8
    style ADS fill:#1e40af,color:#fff,stroke:#1d4ed8
    style PR fill:#0f766e,color:#fff,stroke:#0d9488
    style UR fill:#0f766e,color:#fff,stroke:#0d9488
    style SEC fill:#b45309,color:#fff,stroke:#92400e
    style DB fill:#374151,color:#fff,stroke:#111827
```

---

## Fluxo de Autenticação

```mermaid
flowchart TD
    A([Usuário acessa o sistema]) --> B{Está logado?}

    B -->|Não| C[Tela de Onboarding / Login]
    B -->|Sim| D{Qual papel?}

    C --> E[Cadastro ou Login]
    E --> F{Email válido?}
    F -->|Não| G[Feedback: email inválido]
    G --> E
    F -->|Sim| H[POST /api/auth/login ou /register]
    H --> I{Credenciais OK?}
    I -->|Não| J[Erro de autenticação]
    J --> E
    I -->|Sim| K[Recebe JWT Token]
    K --> D

    D -->|USER| L[Feed de Prompts\nAba Todos e Meus Prompts]
    D -->|ADMIN| M[Feed + Painel Administrativo]

    style A fill:#6366f1,color:#fff,stroke:#4f46e5
    style K fill:#22c55e,color:#fff,stroke:#16a34a
    style G fill:#ef4444,color:#fff,stroke:#dc2626
    style J fill:#ef4444,color:#fff,stroke:#dc2626
    style L fill:#3b82f6,color:#fff,stroke:#2563eb
    style M fill:#f59e0b,color:#fff,stroke:#d97706
```

---

## Fluxo de Prompts e Moderação

```mermaid
flowchart TD
    A([Usuário autenticado cria um prompt]) --> B{É ADMIN?}

    B -->|Sim| C[Prompt publicado imediatamente]
    B -->|Não| D[Prompt vai para fila de moderação]

    D --> E{Admin revisa}
    E -->|Aprova| F[Prompt autorizado\naparece no feed público]
    E -->|Reprova| G[Soft delete\nPrompt removido]

    F --> H{Autor ou Admin quer alterar?}
    H -->|Próprio prompt ou Admin| I[Editar ou Deletar]
    H -->|Outro usuário| J[HTTP 403 Forbidden]

    C --> H

    K([Qualquer usuário logado]) --> L[Visualiza prompts aprovados]
    L --> M[Copia prompt\nPOST /copy incrementa contador]

    style A fill:#6366f1,color:#fff,stroke:#4f46e5
    style C fill:#22c55e,color:#fff,stroke:#16a34a
    style F fill:#22c55e,color:#fff,stroke:#16a34a
    style G fill:#ef4444,color:#fff,stroke:#dc2626
    style J fill:#ef4444,color:#fff,stroke:#dc2626
    style M fill:#3b82f6,color:#fff,stroke:#2563eb
    style D fill:#f59e0b,color:#fff,stroke:#d97706
```

---

## Diagrama de Sequência — Criação de Prompt

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant FE as Frontend (Next.js)
    participant REV as Revisor Local (regex)
    participant BE as Backend (Spring Boot)
    participant DB as PostgreSQL

    U->>FE: Abre formulário de criação
    FE->>REV: Envia texto do prompt em tempo real
    REV-->>FE: Retorna dicas (ação, contexto, formato)
    FE-->>U: Exibe sugestões de melhoria

    U->>FE: Submete formulário
    FE->>FE: Valida campos (título, corpo, desc obrigatórios)

    alt Campos inválidos
        FE-->>U: Exibe erros de validação
    else Campos válidos
        FE->>BE: POST /api/prompts (JWT no header)
        BE->>BE: Valida JWT e extrai role do usuário

        alt Usuário é ADMIN
            BE->>DB: INSERT prompt com authorizedAt igual a now
            DB-->>BE: Prompt salvo e publicado
            BE-->>FE: 201 Created
            FE-->>U: Prompt publicado no feed
        else Usuário é USER
            BE->>DB: INSERT prompt com authorizedAt nulo
            DB-->>BE: Prompt salvo
            BE-->>FE: 201 Created
            FE-->>U: Aguardando moderação
        end
    end
```

---

## Diagrama de Sequência — Moderação Admin

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL

    A->>FE: Acessa painel de moderação
    FE->>BE: GET /api/admin/prompts/pending (JWT Admin)
    BE->>BE: Verifica role ADMIN
    BE->>DB: SELECT prompts WHERE authorizedAt IS NULL AND deletedAt IS NULL
    DB-->>BE: Lista de prompts pendentes
    BE-->>FE: 200 OK com lista de prompts
    FE-->>A: Exibe fila de moderação

    A->>FE: Clica em Aprovar
    FE->>BE: POST /api/admin/prompts/{id}/approve
    BE->>DB: UPDATE prompt SET authorizedAt = now()
    DB-->>BE: Atualizado
    BE-->>FE: 200 OK
    FE-->>A: Prompt aprovado e visível no feed

    A->>FE: Clica em Reprovar
    FE->>BE: POST /api/admin/prompts/{id}/reject
    BE->>DB: UPDATE prompt SET deletedAt = now()
    DB-->>BE: Soft delete aplicado
    BE-->>FE: 200 OK
    FE-->>A: Prompt removido da fila
```

---

## Modelo de Dados

```mermaid
erDiagram
    USER {
        uuid id PK
        string email UK
        string password_hash
        string role "USER ou ADMIN"
        timestamp created_at
    }

    PROMPT {
        uuid id PK
        string title
        text body
        string description
        string model
        string tags
        int copies
        uuid author_id FK
        timestamp created_at
        timestamp updated_at
        timestamp authorized_at "NULL = pendente"
        timestamp deleted_at "NULL = ativo"
    }

    USER ||--o{ PROMPT : "cria"
```

> `authorized_at = NULL` indica prompt pendente de moderação.  
> `deleted_at != NULL` indica soft delete — reprovado ou removido pelo autor/admin.

---

## API Principal

**Base URL:** `http://localhost:8080`

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/auth/register` | Cadastro de novo usuário |
| `POST` | `/api/auth/login` | Login e obtenção do JWT |

### Prompts

| Método | Endpoint | Autenticação | Descrição |
|--------|----------|-------------|-----------|
| `GET` | `/api/prompts` | JWT | Lista prompts aprovados e ativos |
| `POST` | `/api/prompts` | JWT | Cria novo prompt |
| `PUT` | `/api/prompts/{id}` | JWT + owner/admin | Edita prompt existente |
| `DELETE` | `/api/prompts/{id}` | JWT + owner/admin | Remove prompt |
| `POST` | `/api/prompts/{id}/copy` | JWT | Copia e incrementa contador |

### Admin

| Método | Endpoint | Autenticação | Descrição |
|--------|----------|-------------|-----------|
| `GET` | `/api/admin/prompts/pending` | ADMIN | Lista prompts na fila de moderação |
| `POST` | `/api/admin/prompts/{id}/approve` | ADMIN | Aprova prompt |
| `POST` | `/api/admin/prompts/{id}/reject` | ADMIN | Reprova (soft delete) |
| `GET` | `/api/admin/users` | ADMIN | Lista todos os usuários |
| `PUT` | `/api/admin/users/{id}/role` | ADMIN | Altera papel do usuário |

---

## Funcionalidades

### Para todos os usuários autenticados

- Busca textual em tempo real
- Filtro por categoria/tag com autocomplete
- Paginação da listagem
- Aba **Todos** e aba **Meus Prompts**
- Tema claro e escuro
- Copiar prompt (com contador incrementado)
- Expansão do card e modal de visualização completa

### Para ADMIN

- Aprovação/reprovação de prompts pendentes
- Gestão de papéis de usuário
- Importação e exportação de prompts em Markdown

---

## Agente Revisor Local

O revisor analisa o prompt **100% no frontend**, sem chamadas externas ou chave de API.

```mermaid
flowchart LR
    A[Usuário digita o prompt] --> B[Revisor Local\nregex + tamanho]

    B --> C{Análise}
    C --> D[Título incompleto]
    C --> E[Descrição muito curta]
    C --> F[Sem verbo de ação]
    C --> G[Sem contexto definido]
    C --> H[Sem formato de saída]

    D & E & F & G & H --> I[Dicas exibidas em tempo real]
    I -.-> A

    style B fill:#6366f1,color:#fff,stroke:#4f46e5
    style I fill:#22c55e,color:#fff,stroke:#16a34a
    style D fill:#ef4444,color:#fff,stroke:#dc2626
    style E fill:#f59e0b,color:#fff,stroke:#d97706
    style F fill:#f59e0b,color:#fff,stroke:#d97706
    style G fill:#f59e0b,color:#fff,stroke:#d97706
    style H fill:#f59e0b,color:#fff,stroke:#d97706
```

> Zero dependência de API externa. Zero custo. Zero latência de rede.

---

## Validações e Regras de Negócio

| Regra | Escopo |
|-------|--------|
| Título obrigatório | Frontend + Backend |
| Corpo obrigatório | Frontend + Backend |
| Descrição curta obrigatória (`desc`) | Frontend + Backend |
| Email válido (`@Email`) | Frontend + Backend |
| Prompt reprovado não pode ser editado | Backend |
| Usuário só altera/remove próprio prompt | Backend |
| Admin pode alterar/remover qualquer prompt | Backend |
| Cópia só incrementa para prompt autorizado e ativo | Backend |
| Acesso sem permissão retorna `HTTP 403` | Backend |

---

## Desenvolvimento Local

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # desenvolvimento
npm run build     # produção
```

### Testes

```bash
cd frontend
npm test
```

**Fluxo de validação manual recomendado:**

1. Cadastro e login
2. Criação com e sem descrição
3. Revisor em tempo real
4. Aba "meus prompts"
5. Moderação pelo admin
6. Regras de edição/remoção (ownership e 403)
7. Paginação e filtros por categoria

---

## Estrutura do Repositório

```
marketplace-de-prompts/
├── frontend/           # Next.js + React + TypeScript
│   ├── src/
│   │   ├── contexts/   # AuthContext, PromptContext
│   │   ├── components/ # Cards, Modal, Admin, Onboarding
│   │   └── pages/      # Rotas Next.js
│   └── Dockerfile
│
├── backend/            # Spring Boot + Java
│   ├── src/main/java/
│   │   ├── controller/ # AuthController, PromptController, AdminController
│   │   ├── service/    # Regras de negócio
│   │   ├── repository/ # JPA Repositories
│   │   └── security/   # JWT Filter, SecurityConfig
│   └── Dockerfile
│
└── docker-compose.yml  # Orquestra frontend + backend + PostgreSQL
```

---

## Troubleshooting

### Fluxo de Diagnóstico

```mermaid
flowchart TD
    START([Algo não está funcionando]) --> A{Qual serviço?}

    A -->|Frontend não abre| FE[Ver seção Frontend]
    A -->|API retorna erro| BE[Ver seção Backend]
    A -->|Dados não persistem| DB[Ver seção Banco de Dados]
    A -->|Container não sobe| DC[Ver seção Docker]
    A -->|Não sei por onde começar| LOG[Checar logs gerais]

    LOG --> LOGCMD[docker compose logs -f]

    FE --> R1[Porta 3000 ocupada?\nnpm run dev com erro?]
    BE --> R2[Porta 8080 ocupada?\nJWT inválido? 403?]
    DB --> R3[Migrations falhando?\nConexão recusada?]
    DC --> R4[Build falhou?\nVolume corrompido?]

    style START fill:#6366f1,color:#fff,stroke:#4f46e5
    style FE fill:#0f766e,color:#fff,stroke:#0d9488
    style BE fill:#1e40af,color:#fff,stroke:#1d4ed8
    style DB fill:#374151,color:#fff,stroke:#111827
    style DC fill:#b45309,color:#fff,stroke:#92400e
    style LOG fill:#7c3aed,color:#fff,stroke:#6d28d9
    style LOGCMD fill:#7c3aed,color:#fff,stroke:#6d28d9
```

---

### Docker — Diagnóstico Geral

**Ver status de todos os containers:**
```bash
docker compose ps
```

**Ver logs de todos os serviços em tempo real:**
```bash
docker compose logs -f
```

**Ver logs de um serviço específico:**
```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f db
```

**Ver as últimas N linhas de log:**
```bash
docker compose logs --tail=100 backend
docker compose logs --tail=50 frontend
```

**Reiniciar um serviço sem derrubar os outros:**
```bash
docker compose restart backend
docker compose restart frontend
```

**Recriar containers do zero (sem cache):**
```bash
docker compose down
docker compose up --build --force-recreate -d
```

**Recriar apenas um serviço:**
```bash
docker compose up --build --force-recreate -d backend
```

**Limpar tudo, inclusive volumes (apaga dados do banco):**
```bash
docker compose down -v
docker compose up --build -d
```

**Inspecionar um container em execução:**
```bash
docker inspect marketplace-backend
docker inspect marketplace-frontend
```

**Entrar no shell de um container:**
```bash
docker compose exec backend bash
docker compose exec frontend sh
docker compose exec db psql -U postgres -d marketplace
```

---

### Frontend — Diagnóstico

**Verificar se o processo está rodando:**
```bash
# Com Docker
docker compose ps frontend

# Local
lsof -i :3000
```

**Ver logs do frontend (Docker):**
```bash
docker compose logs -f frontend
```

**Erro: porta 3000 já em uso:**
```bash
# Identificar o processo
lsof -ti :3000

# Matar o processo
kill -9 $(lsof -ti :3000)
```

**Limpar cache do Next.js e reinstalar dependências:**
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

**Checar variáveis de ambiente do frontend:**
```bash
cat frontend/.env.local
cat frontend/.env

# No container
docker compose exec frontend env | grep NEXT
```

**Build com saída detalhada para diagnóstico:**
```bash
cd frontend
npm run build 2>&1 | tee build.log
```

**Verificar se o frontend consegue alcançar o backend:**
```bash
docker compose exec frontend wget -qO- http://backend:8080/actuator/health
```

**Erros comuns e soluções:**

| Erro | Causa provável | Solução |
|------|---------------|---------|
| `ECONNREFUSED 8080` | Backend não está rodando | `docker compose restart backend` |
| `Module not found` | Dependência faltando | `npm install` |
| `Hydration error` | Divergência SSR/CSR | Limpar `.next` e reiniciar |
| `401 Unauthorized` | JWT expirado ou ausente | Fazer logout e login novamente |
| `CORS error` | Backend sem CORS configurado | Checar `SecurityConfig` no backend |

---

### Backend — Diagnóstico

**Ver logs do backend (Docker):**
```bash
docker compose logs -f backend
```

**Filtrar logs por nível:**
```bash
docker compose logs backend | grep ERROR
docker compose logs backend | grep WARN
docker compose logs backend | grep "Exception"
```

**Verificar se a porta 8080 está respondendo:**
```bash
curl -v http://localhost:8080/actuator/health
# Resposta esperada: {"status":"UP"}
```

**Testar autenticação manualmente:**
```bash
# Login e captura do token
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin"}'

# Usar o token nas chamadas seguintes
TOKEN="cole_o_jwt_aqui"

# Listar prompts
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/prompts

# Listar pendentes (admin)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/admin/prompts/pending
```

**Verificar conexão do backend com o banco nos logs de startup:**
```bash
docker compose logs backend | grep "HikariPool"
docker compose logs backend | grep "datasource"
docker compose logs backend | grep "Started"
```

**Erro de porta 8080 em uso:**
```bash
lsof -ti :8080
kill -9 $(lsof -ti :8080)
```

**Recompilar o backend sem Docker:**
```bash
cd backend
./mvnw clean package -DskipTests
./mvnw spring-boot:run
```

**Rodar testes e ver relatório:**
```bash
cd backend
./mvnw test
cat target/surefire-reports/*.txt
```

**Erros comuns e soluções:**

| Erro / Log | Causa provável | Solução |
|------------|---------------|---------|
| `Unable to acquire JDBC Connection` | Banco não está up | Aguardar o PostgreSQL iniciar ou `docker compose restart db` |
| `JWT expired` | Token vencido | Reautenticar o usuário |
| `403 Forbidden` | Role insuficiente ou ownership | Checar papel do usuário no banco |
| `Could not resolve placeholder` | Variável de env faltando | Verificar `application.properties` ou env do container |
| `Port 8080 already in use` | Outro processo na porta | `kill -9 $(lsof -ti :8080)` |
| `ddl-auto update failed` | Schema inconsistente | Dropar e recriar o banco (ver seção banco) |

---

### Banco de Dados — Diagnóstico

**Acessar o PostgreSQL pelo container:**
```bash
docker compose exec db psql -U postgres -d marketplace
```

**Listar tabelas:**
```sql
\dt
```

**Ver estrutura de uma tabela:**
```sql
\d prompt
\d "user"
```

**Consultar prompts pendentes de moderação:**
```sql
SELECT id, title, author_id, created_at
FROM prompt
WHERE authorized_at IS NULL
  AND deleted_at IS NULL;
```

**Consultar prompts aprovados:**
```sql
SELECT id, title, copies, authorized_at
FROM prompt
WHERE authorized_at IS NOT NULL
  AND deleted_at IS NULL
ORDER BY authorized_at DESC;
```

**Consultar todos os usuários e seus papéis:**
```sql
SELECT id, email, role, created_at
FROM "user"
ORDER BY created_at;
```

**Promover um usuário para ADMIN manualmente:**
```sql
UPDATE "user"
SET role = 'ADMIN'
WHERE email = 'usuario@exemplo.com';
```

**Verificar conexões ativas:**
```sql
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE datname = 'marketplace';
```

**Ver logs do PostgreSQL:**
```bash
docker compose logs -f db
docker compose logs db | grep ERROR
docker compose logs db | grep FATAL
```

**Verificar se o banco está aceitando conexões:**
```bash
docker compose exec db pg_isready -U postgres
# Resposta esperada: /var/run/postgresql:5432 - accepting connections
```

**Conectar pelo host (sem entrar no container):**
```bash
psql -h localhost -p 5432 -U postgres -d marketplace
```

**Backup do banco:**
```bash
docker compose exec db pg_dump -U postgres marketplace > backup_$(date +%Y%m%d).sql
```

**Restaurar backup:**
```bash
docker compose exec -T db psql -U postgres marketplace < backup_20240101.sql
```

**Resetar o banco completamente (apaga todos os dados):**
```bash
docker compose down -v
docker compose up -d db
sleep 5
docker compose up -d backend frontend
```

**Erros comuns e soluções:**

| Erro | Causa provável | Solução |
|------|---------------|---------|
| `Connection refused :5432` | Container do banco não está up | `docker compose up -d db` e aguardar |
| `role "postgres" does not exist` | Volume corrompido | `docker compose down -v` e recriar |
| `relation "prompt" does not exist` | Migrations não rodaram | Reiniciar o backend para acionar o `ddl-auto` |
| `duplicate key value` | Conflito de seed | Verificar se o admin seed já existe antes de inserir |
| `FATAL: password authentication failed` | Credenciais incorretas | Verificar `POSTGRES_USER` / `POSTGRES_PASSWORD` no compose |

---

### Rede entre Containers

> Em Docker Compose os serviços se comunicam pelo **nome do serviço** definido no `docker-compose.yml` (ex: `http://backend:8080`), nunca por `localhost`.

**Verificar se os containers estão na mesma rede:**
```bash
docker network ls
docker network inspect marketplace_default
```

**Testar conectividade entre containers:**
```bash
# Do frontend para o backend
docker compose exec frontend wget -qO- http://backend:8080/actuator/health

# Ver IP de cada container
docker compose exec backend hostname -I
docker compose exec frontend hostname -I
docker compose exec db hostname -I
```

---

### Checklist de Diagnóstico Rápido

Quando algo não funciona, percorra esta ordem antes de ir mais fundo:

```
1. docker compose ps
   → Todos os containers estão "Up"?

2. docker compose logs --tail=50 <serviço>
   → Há algum ERROR ou FATAL nos logs?

3. curl http://localhost:8080/actuator/health
   → Backend responde {"status":"UP"}?

4. curl http://localhost:3000
   → Frontend responde com HTML?

5. docker compose exec db pg_isready -U postgres
   → Banco aceita conexões?

6. docker compose down && docker compose up --build -d
   → Reset completo resolve?
```

---

## Release Notes

```mermaid
timeline
    title Linha do Tempo de Desenvolvimento

    section Marco 1 Fundacao
        Estrutura inicial : Next.js + Spring Boot + PostgreSQL
                          : CRUD de prompts
                          : Docker Compose funcional

    section Marco 2 Seguranca
        Autenticacao JWT : Cadastro e login
                        : Roles USER e ADMIN
                        : Seed admin

    section Marco 3 Moderacao
        Fila de pendentes : Aprovacao e reprovacao
                          : Feed publico filtrado

    section Marco 4 UX
        Experiencia : Busca e filtros refinados
                    : Onboarding de login
                    : Paginacao e autocomplete

    section Marco 5 Qualidade
        Regras de ownership : Validacao no backend
                            : desc obrigatoria
                            : HTTP 403 explicito
                            : Validacao de email

    section Marco 6 Marketplace
        Rebranding : PromptVault para Marketplace
                   : Cards otimizados
                   : Timestamps completos
                   : Expansao vertical dos cards
```

---

*Para novos colaboradores: recomendamos começar pela leitura da [Arquitetura C4](#arquitetura-c4) e do [Fluxo de Moderação](#fluxo-de-prompts-e-moderação). Adicionar uma seção `Galeria` com screenshots dos estados principais (feed, modal, admin e onboarding) facilita muito o onboarding visual.*