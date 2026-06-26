import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { asyncHandler } from '../middlewares/asyncHandler';
import { setWorkScheduleService } from '../services/workSchedule/setWorkScheduleService';
import { getWorkScheduleService } from '../services/workSchedule/getWorkScheduleService';

export const setWorkSchedule = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await setWorkScheduleService({
      user: req.user,
      body: req.body,
    });

    res.status(result.statusCode).json(result.body);
  }
);

export const getWorkSchedule = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schedule = await getWorkScheduleService({
      user: req.user,
      employeeId: req.params.employeeId,
    });

    res.status(200).json(schedule);
  }
);
