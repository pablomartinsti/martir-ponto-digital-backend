import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { loginSchema } from '../../dtos/employee/employeeSchemas';
import { env } from '../../config/env';
import { Company } from '../../models/Company';
import { Employee } from '../../models/Employee';
import { AppError } from '../../errors/AppError';

interface LoginEmployeeServiceParams {
  body: unknown;
}

export const loginEmployeeService = async ({ body }: LoginEmployeeServiceParams) => {
  const validatedData = loginSchema.parse(body);

  const employee = await Employee.findOne({
    cpf: validatedData.cpf,
  }).select('+password');

  if (!employee) {
    throw new AppError('Funcionario nao encontrado', 404);
  }

  if (!employee.isActive) {
    throw new AppError('Funcionario desativado. Acesso negado.', 403);
  }

  const isPasswordValid = await bcrypt.compare(
    validatedData.password,
    employee.password
  );

  if (!isPasswordValid) {
    throw new AppError('Senha invalida', 401);
  }

  const company = employee.companyId
    ? await Company.findById(employee.companyId)
    : null;

  const token = jwt.sign(
    {
      id: String(employee._id),
      name: employee.name,
      role: employee.role,
      companyId: employee.companyId ? String(employee.companyId) : undefined,
      companyName: company?.name || '',
    },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    token,
    user: {
      id: employee._id,
      name: employee.name,
      role: employee.role,
      companyId: employee.companyId,
      companyName: company?.name || '',
    },
  };
};
