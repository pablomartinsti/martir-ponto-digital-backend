import express from 'express';
import cors from 'cors';

import companyRoutes from './routes/companyRoutes';
import employeeRoutes from './routes/employeeRoutes';
import timeRecordRoutes from './routes/timeRecordRoutes';
import workScheduleRoutes from './routes/workScheduleRoutes';
import absenceRoutes from './routes/absence';
import eventLogRoutes from './routes/eventLogRoutes';
import { corsOrigins } from './config/env';
import { logRequest } from './middlewares/logRequest';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!corsOrigins?.length || !origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origem nao permitida pelo CORS'));
    },
  })
);

app.use(logRequest);

app.use('/', employeeRoutes);
app.use('/', timeRecordRoutes);
app.use('/', workScheduleRoutes);
app.use('/', companyRoutes);
app.use('/', absenceRoutes);
app.use('/', eventLogRoutes);

app.use(errorHandler);

export default app;
