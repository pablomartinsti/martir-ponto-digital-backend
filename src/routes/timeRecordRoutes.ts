import express from 'express';
import {
  clockIn,
  startLunch,
  endLunch,
  clockOut,
  getTimeRecords,
} from '../controllers/timeRecordController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

//Funcionário bate o ponto de entrada
router.post('/clock-in', authenticate, authorize(['employee']), clockIn);

//Funcionário registra saída para almoço
router.post('/lunch-start', authenticate, authorize(['employee']), startLunch);

//Funcionário registra retorno do almoço
router.post('/lunch-end', authenticate, authorize(['employee']), endLunch);

//Funcionário bate o ponto de saída
router.post('/clock-out', authenticate, authorize(['employee']), clockOut);

//Retorna registros de ponto agregados por período (dia, semana ou mês)
router.get(
  '/time-records',
  authenticate,
  authorize(['employee', 'admin', 'sub_admin']),
  getTimeRecords
);

export default router;
