import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { asyncHandler } from '../middlewares/asyncHandler';
import { createSubAdminService } from '../services/company/createSubAdminService';
import { getAllCompaniesService } from '../services/company/getAllCompaniesService';

export const createSubAdmin = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await createSubAdminService({ body: req.body });
    res.status(201).json(result);
  }
);

export const getAllCompanies = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const companies = await getAllCompaniesService({ user: req.user });
    res.status(200).json(companies);
  }
);
