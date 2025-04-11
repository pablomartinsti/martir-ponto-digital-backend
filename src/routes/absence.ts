import express from 'express';
import {
  createOrUpdateAbsence,
  listAbsencesByEmployee,
} from '../controllers/absenceController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Rota para criar ou atualizar uma ausência de funcionário
router.post(
  '/absences',
  authenticate,
  authorize(['sub_admin']),
  createOrUpdateAbsence
);

// Rota para listar todas as ausências de um funcionário específico
router.get(
  '/absences/:employeeId',
  authenticate,
  authorize(['sub_admin']),
  listAbsencesByEmployee
);

export default router;
