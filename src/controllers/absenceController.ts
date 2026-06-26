import { Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types/auth';
import { createOrUpdateAbsenceService } from '../services/absence/createOrUpdateAbsenceService';
import { listAbsencesByEmployeeService } from '../services/absence/listAbsencesByEmployeeService';

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

export const createOrUpdateAbsence = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await createOrUpdateAbsenceService({
      user: req.user,
      body: req.body,
    });

    res.status(result.statusCode).json(result.body);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao registrar ausência.');
  }
};

export const listAbsencesByEmployee = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const absences = await listAbsencesByEmployeeService({
      user: req.user,
      employeeId: req.params.employeeId,
    });

    res.status(200).json(absences);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao buscar ausências.');
  }
};
