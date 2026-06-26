import { AppError } from '../../errors/AppError';
import { Employee } from '../../models/Employee';
import { WorkSchedule } from '../../models/WorkSchedule';
import { AuthUser } from '../../types/auth';

interface GetWorkScheduleServiceParams {
  user?: AuthUser;
  employeeId: string;
}

export const getWorkScheduleService = async ({
  user,
  employeeId,
}: GetWorkScheduleServiceParams) => {
  if (!user || !['admin', 'sub_admin'].includes(user.role)) {
    throw new AppError('Permissao negada.', 403);
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new AppError('Funcionário não encontrado.', 404);
  }

  if (
    user.role === 'sub_admin' &&
    String(employee.companyId) !== String(user.companyId)
  ) {
    throw new AppError('Acesso negado à escala deste funcionário.', 403);
  }

  const schedule = await WorkSchedule.findOne({ employeeId });
  if (!schedule) {
    throw new AppError('Escala não encontrada para este funcionário.', 404);
  }

  return schedule;
};
