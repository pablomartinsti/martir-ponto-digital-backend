import { Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types/auth';
import { createSubAdminService } from '../services/company/createSubAdminService';
import { getAllCompaniesService } from '../services/company/getAllCompaniesService';

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

export const createSubAdmin = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await createSubAdminService({ body: req.body });
    res.status(201).json(result);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao criar sub admin.');
  }
};

export const getAllCompanies = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const companies = await getAllCompaniesService({ user: req.user });
    res.status(200).json(companies);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao buscar empresas.');
  }
};
