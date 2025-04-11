import express from 'express';
import {
  setWorkSchedule,
  getWorkSchedule,
} from '../controllers/workScheduleController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Cria ou atualiza a escala de um funcionário
router.post(
  '/work-schedules',
  authenticate,
  authorize(['admin', 'sub_admin']),
  setWorkSchedule
);

// Busca a escala de um funcionário específico por ID
router.get(
  '/work-schedules/:employeeId',
  authenticate,
  authorize(['admin', 'sub_admin']),
  getWorkSchedule
);

export default router;
