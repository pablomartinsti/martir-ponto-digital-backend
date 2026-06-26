import { AppError } from '../../errors/AppError';
import { Absence } from '../../models/Absence';
import { Employee } from '../../models/Employee';
import { AuthUser } from '../../types/auth';

interface ListAbsencesByEmployeeServiceParams {
  user?: AuthUser;
  employeeId: string;
}

export const listAbsencesByEmployeeService = async ({
  user,
  employeeId,
}: ListAbsencesByEmployeeServiceParams) => {
  if (!user || user.role !== 'sub_admin') {
    throw new AppError('Apenas sub_admin pode acessar ausências.', 403);
  }

  const employee = await Employee.findById(employeeId);
  if (!employee || String(employee.companyId) !== String(user.companyId)) {
    throw new AppError('Funcionário não pertence à sua empresa.', 403);
  }

  return Absence.find({ employeeId });
};
