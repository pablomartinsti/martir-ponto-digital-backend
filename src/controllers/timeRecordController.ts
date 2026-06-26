import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { asyncHandler } from '../middlewares/asyncHandler';
import { clockInService } from '../services/timeRecord/clockInService';
import { updateTimeRecordFieldService } from '../services/timeRecord/updateTimeRecordFieldService';
import { getTodayTimeRecordService } from '../services/timeRecord/getTodayTimeRecordService';
import { getTimeRecordsService } from '../services/timeRecord/getTimeRecordsService';

export const getTimeRecords = asyncHandler(async (req: Request, res: Response) => {
  const records = await getTimeRecordsService({
    user: (req as AuthenticatedRequest).user,
    query: req.query,
  });

  res.status(200).json(records);
});

export const clockIn = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const timeRecord = await clockInService({ user: req.user, body: req.body });
    res.status(201).json(timeRecord);
  }
);

export const startLunch = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const timeRecord = await updateTimeRecordFieldService({
      user: req.user,
      body: req.body,
      field: 'lunchStart',
    });

    res.status(200).json(timeRecord);
  }
);

export const endLunch = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const timeRecord = await updateTimeRecordFieldService({
      user: req.user,
      body: req.body,
      field: 'lunchEnd',
    });

    res.status(200).json(timeRecord);
  }
);

export const clockOut = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const timeRecord = await updateTimeRecordFieldService({
      user: req.user,
      body: req.body,
      field: 'clockOut',
    });

    res.status(200).json(timeRecord);
  }
);

export const getTodayTimeRecord = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const record = await getTodayTimeRecordService({ user: req.user });
    res.status(200).json(record);
  }
);
