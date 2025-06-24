# 🕒 Martir Ponto Digital - Backend

Sistema de ponto digital desenvolvido para pequenas empresas com poucos funcionários, oferecendo uma solução acessível, funcional e fácil de usar.

---

## 🚀 Tecnologias Utilizadas

- **Node.js** + **Express**
- **TypeScript**
- **MongoDB** com **Mongoose**
- **Zod** (validação de dados)
- **Dayjs** (manipulação de datas com fuso horário)
- **JWT** (autenticação)
- **Docker** (ambiente local)
- **AWS EC2** (deploy)
- **MongoDB Atlas** (banco em nuvem)

---

## 👨‍💼 Funcionalidades

### 🔐 Autenticação

- Login com CPF e senha
- Geração de token JWT
- Controle de acesso por tipo de usuário (admin, sub_admin, funcionário)

### 🏢 Multiempresas

- Admin pode cadastrar sub_admins e empresas com CNPJ
- Sub_admin gerencia apenas seus funcionários e dados

### 👷 Cadastro de Funcionários

- Criação de funcionários por sub_admins ou admin
- Controle de status (ativo/inativo)
- Exclusão em cascata dos dados da empresa quando o sub_admin é removido

### 📅 Escala de Trabalho

- Registro da escala semanal personalizada
- Suporte para horário de almoço, dias de folga e jornadas parciais
- Atualização ou criação na mesma rota

### 🕓 Registro de Ponto

- Bater ponto com validação de geolocalização (entrada, almoço e saída)
- Cálculo automático das horas trabalhadas
- Verificação da jornada esperada e tempo mínimo de almoço
- Restrição para registros fora da escala

### 📊 Relatório de Ponto

- Filtro por dia, semana e mês
- Retorna:
  - Horas trabalhadas
  - Horas extras
  - Horas faltantes
  - Faltas justificadas/injustificadas
  - Férias, atestados, feriados e folgas

### 📌 Ausências

- Registro de faltas, férias, atestados, feriados e folgas
- Apenas permitido para dias passados e sem jornada completa
- Sub_admins podem atualizar ausências pela mesma rota

---

## 🌐 Deploy

- **Backend**: Hospedado na **AWS EC2**, garantindo performance e disponibilidade
- **Banco de Dados**: Utiliza **MongoDB Atlas** com acesso remoto e seguro
- **Domínio**: API acessível via subdomínio com certificado SSL gerado com Certbot

---

## 📂 Organização do Código

- `controllers/`: Lógica de negócio e validações de cada recurso
- `models/`: Modelos Mongoose (Employee, TimeRecord, WorkSchedule, Absence, Company)
- `utils/`: Funções auxiliares como `timeRecordAggregation.ts`
- `middlewares/`: Autenticação e validação de tokens
- `routes/`: Organização das rotas por responsabilidade

---

## 🧪 Testes

- Testado com HTTPie.
- Verificado fluxo completo de jornada: entrada → almoço → retorno → saída
- Validação de localização, escala, horário e regras de ausência

---


