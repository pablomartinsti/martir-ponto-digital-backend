# 🕒 Martir Ponto Digital API

Backend do **Martir Ponto Digital**, um sistema de controle de ponto eletrônico desenvolvido para pequenas e médias empresas.

A API foi construída com **Node.js, Express, TypeScript e MongoDB**, oferecendo autenticação segura, gestão multiempresa, geolocalização para registro de ponto e relatórios completos de jornada.

---

# 🚀 Estado Atual

O backend já possui:

- Autenticação com JWT.
- Controle de acesso por perfis (**ADMIN, SUB_ADMIN e EMPLOYEE**).
- Cadastro e gerenciamento de empresas.
- Cadastro de funcionários por empresa.
- Controle de funcionários ativos/inativos.
- Escalas de trabalho personalizadas.
- Registro de ponto com geolocalização.
- Controle de entrada, almoço e saída.
- Validação de distância entre funcionário e empresa.
- Controle de ausências (férias, atestados, folgas e faltas).
- Relatórios diários, semanais e mensais.
- Cálculo automático de horas extras e horas faltantes.
- Tratamento global de erros.
- Smoke test automatizado para validação do fluxo principal.

---

# 🛠 Tecnologias Utilizadas

- Node.js
- TypeScript
- Express
- MongoDB
- Mongoose
- Zod
- JWT
- bcrypt
- Docker Compose
- Dayjs
- ESLint
- Prettier

---

# 🏗 Arquitetura

A API segue uma arquitetura baseada em separação de responsabilidades.

```text
Request
   ↓
Routes
   ↓
Controllers
   ↓
Services
   ↓
Models (MongoDB)
   ↓
Response
```

Os controllers possuem apenas responsabilidades HTTP.

Toda a regra de negócio fica centralizada na camada de serviços.

---

# 📂 Estrutura de Pastas

```text
src/
├── app.ts
├── server.ts
│
├── config/              # Variáveis de ambiente e configurações
├── controllers/         # Entrada HTTP (req, res)
├── services/            # Regras de negócio
├── models/              # Schemas do MongoDB
├── routes/              # Definição das rotas
├── middlewares/         # Auth, autorização e error handler
├── dtos/                # Validações e contratos
├── errors/              # Erros customizados
├── utils/               # Funções auxiliares
├── types/               # Tipagens compartilhadas
├── script/              # Scripts de automação e smoke tests
└── database/            # Configuração de banco
```

---

# 🔒 Segurança

A API implementa:

- Autenticação via JWT.
- Senhas criptografadas com bcrypt.
- Controle de acesso baseado em papéis (RBAC).
- Isolamento de dados por empresa.
- Validação de dados utilizando Zod.
- Controle de origem via CORS.
- Validação de geolocalização para registro de ponto.

---

# 📦 Requisitos

- Node.js 22+
- npm
- Docker Desktop (opcional)
- MongoDB local ou MongoDB Atlas

---

# ⚙️ Configuração Local

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` na raiz do projeto:

```env
PORT=3000
NODE_ENV=development

MONGO_URI=mongodb://localhost:27017/martir-ponto-digital

JWT_SECRET=sua_chave_super_secreta_com_no_minimo_32_caracteres

CORS_ORIGIN=http://localhost:5173
```

---

# 🐳 Executando MongoDB com Docker

```bash
docker compose up -d
```

Exemplo de `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongo:
    image: mongo:7
    container_name: martir-mongo
    restart: always
    ports:
      - '27017:27017'

    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

---

# ▶️ Executando a API

Modo desenvolvimento:

```bash
npm run dev
```

Build de produção:

```bash
npm run build
npm start
```

URL padrão:

```text
http://localhost:3000
```

---

# 📜 Scripts

```bash
npm run dev               # Inicia a API em desenvolvimento
npm run build             # Compila TypeScript
npm start                 # Inicia a aplicação compilada
npm run create:admin      # Cria administrador inicial
npm run test:smoke        # Executa smoke test automatizado
```

---

# 🧪 Smoke Test

A API possui um script automatizado responsável por validar o fluxo principal do sistema.

O teste verifica:

- Login de administrador.
- Criação de empresa.
- Criação de sub_admin.
- Criação de funcionário.
- Cadastro de escala.
- Login de funcionário.
- Registro de entrada.
- Registro de almoço.
- Registro de saída.
- Consulta de relatório.
- Validações de segurança.

Execute:

```bash
npm run test:smoke
```

Resultado esperado:

```text
Smoke test finalizado com sucesso.
```

---

# 👥 Perfis e Permissões

| Perfil    | Descrição                                        |
| --------- | ------------------------------------------------ |
| ADMIN     | Gerencia todo o sistema                          |
| SUB_ADMIN | Gerencia funcionários e dados da própria empresa |
| EMPLOYEE  | Registra ponto e consulta seus relatórios        |

---

# 📌 Funcionalidades

## Autenticação

```http
POST /login
```

Realiza autenticação do usuário e retorna um JWT.

---

## Empresas

```http
POST /companies
GET /companies
PUT /companies/:id
DELETE /companies/:id
```

Permite o gerenciamento de empresas.

---

## Funcionários

```http
POST /employees
GET /employees
PATCH /employees/:id/status
```

Permite o gerenciamento dos funcionários.

---

## Escalas

```http
POST /work-schedules
PUT /work-schedules
GET /work-schedules
```

Gerencia escalas personalizadas.

---

## Registro de Ponto

```http
POST /clock-in
POST /lunch-start
POST /lunch-end
POST /clock-out
```

Fluxo:

```text
Entrada
↓
Saída almoço
↓
Retorno almoço
↓
Saída
```

---

## Relatórios

```http
GET /time-records/today
GET /time-records
```

Filtros disponíveis:

```http
GET /time-records?period=day
GET /time-records?period=week
GET /time-records?period=month
```

---

## Ausências

```http
POST /absences
PUT /absences
GET /absences
```

Tipos suportados:

- Férias
- Atestado
- Folga
- Feriado
- Falta justificada
- Falta injustificada

---

# 🛠 Guia de Manutenção

Ao criar uma nova funcionalidade:

1. Crie ou ajuste o Model.
2. Crie o DTO em `src/dtos`.
3. Implemente a regra em `src/services`.
4. Crie o Controller.
5. Registre a rota.
6. Proteja a rota com autenticação/autorização.
7. Execute:

```bash
npm run build
npm run test:smoke
```

---

# ✅ Checklist Antes de Publicar

```bash
npm run build
```

Com a API rodando:

```bash
npm run test:smoke
```

Resultado esperado:

```text
Smoke test finalizado com sucesso.
```
