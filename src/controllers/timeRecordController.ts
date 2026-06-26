import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types/auth';
import { clockInService } from '../services/timeRecord/clockInService';
import { updateTimeRecordFieldService } from '../services/timeRecord/updateTimeRecordFieldService';
import { getTodayTimeRecordService } from '../services/timeRecord/getTodayTimeRecordService';
import { getTimeRecordsService } from '../services/timeRecord/getTimeRecordsService';

const handleControllerError = (
  error: unknown,
  res: Response,
  fallbackMessage: string
): void => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ errors: error.errors });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(fallbackMessage, error);
  res.status(500).json({ error: fallbackMessage });
};

export const getTimeRecords = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const records = await getTimeRecordsService({
      user: (req as AuthenticatedRequest).user,
      query: req.query,
    });

    res.status(200).json(records);
  } catch (error) {
    handleControllerError(error, res, 'Erro interno ao buscar registros.');
  }
};

export const clockIn = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const timeRecord = await clockInService({ user: req.user, body: req.body });
    res.status(201).json(timeRecord);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao registrar entrada.');
  }
};

export const startLunch = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const timeRecord = await updateTimeRecordFieldService({
      user: req.user,
      body: req.body,
      field: 'lunchStart',
    });

    res.status(200).json(timeRecord);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao registrar lunchStart.');
  }
};

export const endLunch = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const timeRecord = await updateTimeRecordFieldService({
      user: req.user,
      body: req.body,
      field: 'lunchEnd',
    });

    res.status(200).json(timeRecord);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao registrar lunchEnd.');
  }
};

export const clockOut = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const timeRecord = await updateTimeRecordFieldService({
      user: req.user,
      body: req.body,
      field: 'clockOut',
    });

    res.status(200).json(timeRecord);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao registrar clockOut.');
  }
};

export const getTodayTimeRecord = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const record = await getTodayTimeRecordService({ user: req.user });
    res.status(200).json(record);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao buscar registro do dia.');
  }
};
