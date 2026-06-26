import bcrypt from 'bcrypt';
import { resetPasswordSchema } from '../../dtos/employee/employeeSchemas';
import { Employee } from '../../models/Employee';
import { AuthUser } from '../../types/auth';
import { AppError } from '../../errors/AppError';
import {
  ensureAuthenticated,
  ensureSubAdminCanManageEmployee,
} from './employeeHelpers';

interface ResetPasswordServiceParams {
  user?: AuthUser;
  employeeId: string;
  body: unknown;
}

export const resetPasswordService = async ({
  user,
  employeeId,
  body,
}: ResetPasswordServiceParams) => {
  const requester = ensureAuthenticated(user);

  if (requester.role !== 'admin' && requester.role !== 'sub_admin') {
    throw new AppError('Apenas admin ou sub admin podem redefinir senhas.', 403);
  }

  const { newPassword } = resetPasswordSchema.parse(body);
  const employee = await Employee.findById(employeeId).select('+password');

  if (!employee) {
    throw new AppError('Usuario nao encontrado.', 404);
  }

  ensureSubAdminCanManageEmployee(
    requester,
    employee,
    'Sub admin so pode redefinir senha de funcionarios da propria empresa.'
  );

  employee.password = await bcrypt.hash(newPassword, 10);
  await employee.save();

  return { message: 'Senha redefinida com sucesso.' };
};
