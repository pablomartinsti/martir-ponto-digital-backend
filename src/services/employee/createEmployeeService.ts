import bcrypt from 'bcrypt';
import { employeeSchema, companyIdSchema } from '../../dtos/employee/employeeSchemas';
import { Company } from '../../models/Company';
import { Employee } from '../../models/Employee';
import { AuthUser } from '../../types/auth';
import { AppError } from '../../errors/AppError';
import { ensureAuthenticated, serializeEmployee } from './employeeHelpers';

interface CreateEmployeeServiceParams {
  user?: AuthUser;
  body: unknown;
}

export const createEmployeeService = async ({
  user,
  body,
}: CreateEmployeeServiceParams) => {
  const requester = ensureAuthenticated(user);
  const validatedData = employeeSchema.parse(body);
  const bodyData = body as { companyId?: unknown };

  let companyId: string | undefined;

  if (requester.role === 'admin') {
    companyId = companyIdSchema.parse(bodyData.companyId);

    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError('Empresa nao encontrada.', 404);
    }
  } else if (requester.role === 'sub_admin') {
    companyId = requester.companyId;

    if (!companyId) {
      throw new AppError('Sub admin sem empresa vinculada.', 400);
    }
  } else {
    throw new AppError('Permissao negada.', 403);
  }

  const existing = await Employee.findOne({ cpf: validatedData.cpf });
  if (existing) {
    throw new AppError('CPF ja cadastrado.', 400);
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  const employee = new Employee({
    ...validatedData,
    password: hashedPassword,
    companyId,
  });

  await employee.save();

  return serializeEmployee(employee);
};
