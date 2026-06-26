import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { asyncHandler } from '../middlewares/asyncHandler';
import { createEmployeeService } from '../services/employee/createEmployeeService';
import { loginEmployeeService } from '../services/employee/loginEmployeeService';
import { getEmployeesService } from '../services/employee/getEmployeesService';
import { toggleEmployeeStatusService } from '../services/employee/toggleEmployeeStatusService';
import { resetPasswordService } from '../services/employee/resetPasswordService';
import { deleteSubAdminService } from '../services/employee/deleteSubAdminService';

export const createEmployee = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const employee = await createEmployeeService({
      user: req.user,
      body: req.body,
    });

    res.status(201).json(employee);
  }
);

export const resetPassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await resetPasswordService({
      user: req.user,
      employeeId: req.params.id,
      body: req.body,
    });

    res.status(200).json(result);
  }
);

export const login = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await loginEmployeeService({ body: req.body });
    res.status(200).json(result);
  }
);

export const getEmployees = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const employees = await getEmployeesService({
      user: req.user,
      queryParams: req.query,
    });

    res.status(200).json(employees);
  }
);

export const toggleEmployeeStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await toggleEmployeeStatusService({
      user: req.user,
      employeeId: req.params.id,
      body: req.body,
    });

    res.status(200).json(result);
  }
);

export const deleteSubAdminAndEmployees = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await deleteSubAdminService({ params: req.params });
    res.status(200).json(result);
  }
);
