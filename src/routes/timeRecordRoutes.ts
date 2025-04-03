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

router.post('/clock-in', authenticate, authorize(['employee']), clockIn);
router.post('/lunch-start', authenticate, authorize(['employee']), startLunch);
router.post('/lunch-end', authenticate, authorize(['employee']), endLunch);
router.post('/clock-out', authenticate, authorize(['employee']), clockOut);
router.get(
  '/time-records',
  authenticate,
  authorize(['employee', 'admin', 'sub_admin']),
  getTimeRecords
);

export default router;
