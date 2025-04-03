import express from 'express';
import cors from 'cors'; // Importa o CORS
import companyRoutes from './routes/companyRoutes';
import employeeRoutes from './routes/employeeRoutes';
import timeRecordRoutes from './routes/timeRecordRoutes';
import workScheduleRoutes from './routes/workScheduleRoutes';

const app = express();
app.use(express.json());

app.use(cors());
// Registrar rotas

app.use('/', employeeRoutes);
app.use('/', timeRecordRoutes);
app.use('/', workScheduleRoutes);
app.use('/', companyRoutes);

export default app;
