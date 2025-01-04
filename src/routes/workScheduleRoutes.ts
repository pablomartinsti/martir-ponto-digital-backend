import express from 'express';
import {
  setWorkSchedule,
  getWorkSchedule,
  listWorkSchedules,
  deleteWorkSchedule,
} from '../controllers/workScheduleController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

router.post(
  '/work-schedules',
  authenticate,
  authorize(['admin']),
  setWorkSchedule
);
router.get(
  '/work-schedules/:employeeId',
  authenticate,
  authorize(['admin']),
  getWorkSchedule
);
router.get(
  '/work-schedules',
  authenticate,
  authorize(['admin']),
  listWorkSchedules
);

router.delete(
  '/work-schedule/:employeeId',
  authenticate,
  authorize(['admin']),
  deleteWorkSchedule
);

export default router;
