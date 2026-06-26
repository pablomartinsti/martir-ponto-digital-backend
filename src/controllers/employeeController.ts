import { Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types/auth';
import { createEmployeeService } from '../services/employee/createEmployeeService';
import { loginEmployeeService } from '../services/employee/loginEmployeeService';
import { getEmployeesService } from '../services/employee/getEmployeesService';
import { toggleEmployeeStatusService } from '../services/employee/toggleEmployeeStatusService';
import { resetPasswordService } from '../services/employee/resetPasswordService';
import { deleteSubAdminService } from '../services/employee/deleteSubAdminService';

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

export const createEmployee = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const employee = await createEmployeeService({
      user: req.user,
      body: req.body,
    });

    res.status(201).json(employee);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao criar funcionario.');
  }
};

export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await resetPasswordService({
      user: req.user,
      employeeId: req.params.id,
      body: req.body,
    });

    res.status(200).json(result);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao redefinir senha.');
  }
};

export const login = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await loginEmployeeService({ body: req.body });
    res.status(200).json(result);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao realizar login.');
  }
};

export const getEmployees = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const employees = await getEmployeesService({
      user: req.user,
      queryParams: req.query,
    });

    res.status(200).json(employees);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao listar funcionarios.');
  }
};

export const toggleEmployeeStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await toggleEmployeeStatusService({
      user: req.user,
      employeeId: req.params.id,
      body: req.body,
    });

    res.status(200).json(result);
  } catch (error) {
    handleControllerError(error, res, 'Erro ao atualizar status.');
  }
};

export const deleteSubAdminAndEmployees = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await deleteSubAdminService({ params: req.params });
    res.status(200).json(result);
  } catch (error) {
    handleControllerError(error, res, 'Erro interno ao excluir sub admin.');
  }
};
