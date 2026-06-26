import { toggleStatusSchema } from '../../dtos/employee/employeeSchemas';
import { Employee } from '../../models/Employee';
import { AuthUser } from '../../types/auth';
import { AppError } from '../../errors/AppError';
import {
  ensureAuthenticated,
  ensureSubAdminCanManageEmployee,
} from './employeeHelpers';

interface ToggleEmployeeStatusServiceParams {
  user?: AuthUser;
  employeeId: string;
  body: unknown;
}

export const toggleEmployeeStatusService = async ({
  user,
  employeeId,
  body,
}: ToggleEmployeeStatusServiceParams) => {
  const requester = ensureAuthenticated(user);
  const { isActive } = toggleStatusSchema.parse(body);

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new AppError('Funcionario nao encontrado.', 404);
  }

  ensureSubAdminCanManageEmployee(
    requester,
    employee,
    'Permissao negada para alterar usuarios fora da sua empresa ou com perfil administrativo.'
  );

  const updatedEmployee = await Employee.findByIdAndUpdate(
    employeeId,
    { isActive },
    { new: true }
  );

  if (updatedEmployee?.role === 'sub_admin' && isActive === false) {
    await Employee.updateMany(
      { companyId: updatedEmployee.companyId, role: 'employee' },
      { isActive: false }
    );
  }

  return {
    message: `Status do funcionario atualizado para ${
      isActive ? 'ativo' : 'inativo'
    }`,
    employee: updatedEmployee,
  };
};
