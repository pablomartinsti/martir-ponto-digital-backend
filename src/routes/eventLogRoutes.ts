import express from 'express';
import {
  createEventLog,
  getEventLogs,
  deleteEventLogsByMonth,
} from '../controllers/eventLogController';

const router = express.Router();

// 🔹 Essa rota é usada para o app enviar logs de erros do frontend (não precisa autenticação)
router.post('/log-event', createEventLog);
router.get('/event-logs', getEventLogs);
router.delete('/delete-event', deleteEventLogsByMonth);

export default router;
