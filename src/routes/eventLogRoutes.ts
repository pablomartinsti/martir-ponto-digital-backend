import express from 'express';
import {
  createEventLog,
  deleteEventLogsByMonth,
  getEventLogs,
} from '../controllers/eventLogController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/log-event', createEventLog);
router.get('/event-logs', authenticate, authorize(['admin']), getEventLogs);
router.delete(
  '/delete-event',
  authenticate,
  authorize(['admin']),
  deleteEventLogsByMonth
);

export default router;
