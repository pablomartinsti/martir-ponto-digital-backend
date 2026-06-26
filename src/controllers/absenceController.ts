import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { asyncHandler } from '../middlewares/asyncHandler';
import { createOrUpdateAbsenceService } from '../services/absence/createOrUpdateAbsenceService';
import { listAbsencesByEmployeeService } from '../services/absence/listAbsencesByEmployeeService';

export const createOrUpdateAbsence = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await createOrUpdateAbsenceService({
      user: req.user,
      body: req.body,
    });

    res.status(result.statusCode).json(result.body);
  }
);

export const listAbsencesByEmployee = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const absences = await listAbsencesByEmployeeService({
      user: req.user,
      employeeId: req.params.employeeId,
    });

    res.status(200).json(absences);
  }
);
