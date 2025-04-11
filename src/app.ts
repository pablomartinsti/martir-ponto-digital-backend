// Arquivo principal de configuração da aplicação Express (app.ts)

import express from 'express';
import cors from 'cors'; // Middleware para habilitar CORS (Cross-Origin Resource Sharing)

// Importação das rotas organizadas por domínio
import companyRoutes from './routes/companyRoutes';
import employeeRoutes from './routes/employeeRoutes';
import timeRecordRoutes from './routes/timeRecordRoutes';
import workScheduleRoutes from './routes/workScheduleRoutes';
import absenceRoutes from './routes/absence';

const app = express();

// Middleware que permite a aplicação interpretar JSON no corpo das requisições
app.use(express.json());

// Middleware que habilita o CORS para aceitar requisições de diferentes origens
app.use(cors());

// Registro das rotas
// Todas as rotas são montadas diretamente na raiz ("/")
// Ex: POST /login, GET /companies, POST /absences etc.
app.use('/', employeeRoutes);
app.use('/', timeRecordRoutes);
app.use('/', workScheduleRoutes);
app.use('/', companyRoutes);
app.use('/', absenceRoutes);

// Exporta o app para ser usado no arquivo server.ts
export default app;
