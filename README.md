# Marketplace de Prompts

## Como rodar com Docker Compose (rápido)

Na raiz do projeto, execute:

```bash
docker compose up --build -d
```

Acesse:
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8080](http://localhost:8080)
- PostgreSQL: `localhost:5432`

Para parar tudo:

```bash
docker compose down
```

---

Marketplace colaborativo para criar, publicar, revisar, copiar e gerenciar prompts com autenticação, moderação e experiência orientada a produtividade.

Stack principal:
- Frontend: Next.js + React + TypeScript
- Backend: Spring Boot + Spring Security + JWT
- Banco: PostgreSQL
- Orquestração: Docker Compose

---

## Índice

- [Visão geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Fluxo de autenticação e perfis](#fluxo-de-autenticação-e-perfis)
- [Fluxo de prompts e moderação](#fluxo-de-prompts-e-moderação)
- [Agente revisor local (regex)](#agente-revisor-local-regex)
- [Modelo de dados](#modelo-de-dados)
- [API principal](#api-principal)
- [Executando com Docker](#executando-com-docker)
- [Executando em desenvolvimento local](#executando-em-desenvolvimento-local)
- [Validações e regras de negócio](#validações-e-regras-de-negócio)
- [Testes e validação manual](#testes-e-validação-manual)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Release notes (linha do tempo de acontecimentos)](#release-notes-linha-do-tempo-de-acontecimentos)

---

## Visão geral

O MP nasceu para ser um catálogo de prompts realmente utilizável no dia a dia, não só uma lista estática. A aplicação combina:
- descoberta por busca e categorias;
- criação com ajuda de revisão em tempo real;
- moderação de conteúdo;
- controle de permissões por autoria e papel administrativo;
- medição simples de uso por número de cópias.

O objetivo é equilibrar duas coisas: velocidade para publicar e segurança para manter qualidade no acervo.

---

## Arquitetura

### Frontend

Aplicação Next.js com interface única de operação (`PromptVaultApp`) e contexto para estado de autenticação e prompts:
- `AuthContext`: login, cadastro, logout, perfil e papel;
- `PromptContext`: leitura, criação, atualização, remoção e refresh.

### Backend

API REST em Spring Boot com separação por camadas:
- `controller`: contrato HTTP;
- `service`: regras de negócio;
- `repository`: persistência JPA.

Pontos-chave:
- autenticação via JWT;
- autorização por role (`USER`, `ADMIN`);
- regras de ownership de prompt aplicadas no servidor.

### Banco

PostgreSQL com esquema gerenciado por JPA/Hibernate (`ddl-auto=update`).

---

## Funcionalidades

- Listagem de prompts com busca textual.
- Filtro por categoria/tag.
- Paginação da listagem.
- Aba `todos` e aba `meus prompts`.
- Card compacto com:
  - título,
  - descrição curta,
  - 2 primeiras tags,
  - autor,
  - contador de cópias.
- Expansão do prompt no próprio card (somente vertical).
- Modal de visualização completa.
- Criação e edição com validações.
- Importação e exportação de prompts em Markdown (admin).
- Painel administrativo para aprovar/reprovar prompts pendentes.
- Gestão de papéis de usuário no admin.
- Onboarding para usuários não logados.
- Tema claro/escuro.

---

## Fluxo de autenticação e perfis

O sistema trabalha com dois papéis:
- `USER`: cria prompts e interage com acervo;
- `ADMIN`: aprova/reprova pendências, exporta, limpa e gerencia usuários.

Credencial seed para ambiente local:
- email: `admin@admin.com`
- senha: `admin`

Validação de email no frontend:
- login e cadastro exigem formato válido de email;
- feedback direto ao usuário com mensagem `email invalido`.

---

## Fluxo de prompts e moderação

1. Usuário autenticado cria prompt.
2. Se for admin, pode publicar imediatamente.
3. Se não for admin, o prompt vai para fila de moderação.
4. Admin aprova ou reprova (soft delete).
5. Apenas prompts aprovados aparecem no feed público.

Regras de alteração:
- autor pode editar/deletar o próprio prompt;
- admin pode editar/deletar qualquer prompt;
- usuário sem permissão recebe `403`.

---

## Agente revisor local (regex)

No formulário de criação/edição existe um bloco de revisão em tempo real sem dependência de API externa.

Ele analisa o texto do prompt por heurísticas (regex + tamanho) e mostra dicas práticas, por exemplo:
- título incompleto;
- descrição curta;
- falta de verbo de ação;
- falta de contexto;
- falta de formato de saída esperado.

Esse revisor foi desenhado para funcionar 100% no frontend e sem chave de IA.

---

## Modelo de dados

Entidade principal: `Prompt`.

Campos relevantes:
- `id`
- `title`
- `body`
- `author`
- `tags`
- `model`
- `description` (`desc` no contrato da API)
- `copies`
- `createdAt`
- `updatedAt`
- `authorizedAt`
- `deletedAt`

Observações:
- `desc` é obrigatória na criação/edição;
- timestamps são exibidos na UI com data e horário (`HH:mm:ss`).

---

## API principal

Base local: `http://localhost:8080`

Autenticação:
- `POST /api/auth/login`
- `POST /api/auth/register`

Prompts:
- `GET /api/prompts` (apenas autorizados e não removidos)
- `POST /api/prompts` (autenticado)
- `PUT /api/prompts/{id}` (autenticado + permissão)
- `DELETE /api/prompts/{id}` (autenticado + permissão)
- `POST /api/prompts/{id}/copy` (autenticado)

Admin:
- `GET /api/admin/prompts/pending`
- `POST /api/admin/prompts/{id}/approve`
- `POST /api/admin/prompts/{id}/reject`
- `GET /api/admin/users`
- `PUT /api/admin/users/{id}/role`

---

## Executando com Docker

Na raiz do projeto:

```bash
docker compose up --build -d
```

Acessos:
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8080](http://localhost:8080)
- PostgreSQL: `localhost:5432`

Parar serviços:

```bash
docker compose down
```

---

## Executando em desenvolvimento local

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Build de produção do frontend:

```bash
cd frontend
npm run build
```

---

## Validações e regras de negócio

- Título e corpo são obrigatórios.
- Descrição curta é obrigatória.
- Email válido é exigido no login e cadastro (frontend) e no backend (`@Email`).
- Usuário comum só altera/remover prompts próprios.
- Admin pode alterar/remover qualquer prompt.
- Prompt reprovado não pode ser editado.
- Cópia só incrementa para prompt autorizado e ativo.

---

## Testes e validação manual

Frontend:

```bash
cd frontend
npm test
```

Validação recomendada de fluxo:
- cadastro/login;
- criação com e sem descrição;
- revisão de prompt em tempo real;
- aba meus prompts;
- moderação por admin;
- regras de permissão de edição/remoção;
- paginação e filtros por categoria.

---

## Estrutura do repositório

- `frontend/`: aplicação web e UX
- `backend/`: API, segurança e regras de negócio
- `docker-compose.yml`: orquestra frontend + backend + postgres

---

## Release notes (linha do tempo de acontecimentos)

### Marco 1 — Fundação fullstack
- Estrutura inicial com frontend Next.js, backend Spring Boot e PostgreSQL.
- Primeiros endpoints para CRUD de prompts.
- Compose para subir stack completa.

### Marco 2 — Segurança e identidade
- Introdução de autenticação JWT.
- Cadastro e login de usuários.
- Separação de papéis (`USER` e `ADMIN`) com seed administrativo.

### Marco 3 — Moderação de conteúdo
- Criação de fila de prompts pendentes.
- Aprovação/reprovação por admin.
- Feed público passando a exibir apenas prompts autorizados.

### Marco 4 — Evolução de experiência no frontend
- Visual mais orientado a produtividade.
- Busca, ordenação e filtros refinados.
- Onboarding de login para novos usuários.
- Aba `meus prompts`.
- Paginação na listagem.
- Busca de categorias com autocomplete.
- Exibição de top categorias com expansão controlada.

### Marco 5 — Regras de ownership e qualidade
- Backend passou a validar ownership para update/delete.
- `desc` tornou-se obrigatória.
- Tratamento explícito de `403` para tentativas sem permissão.
- Validação de email no fluxo de autenticação no frontend.

### Marco 6 — Marketplace de Prompts
- Rebranding de PromptVault para Marketplace de Prompts.
- Ajustes de microcopy e metadata.
- Melhorias no card para consumo rápido (informação essencial primeiro).
- Data de criação com horário completo (hora, minuto e segundo).
- Ajuste da expansão do card para comportamento somente vertical.

---

Se quiser complementar o README com prints da interface, vale adicionar uma seção `Galeria` com screenshots dos estados principais (listagem, modal de prompt, admin pendentes e onboarding). Isso ajuda muito onboarding de novos colaboradores.
