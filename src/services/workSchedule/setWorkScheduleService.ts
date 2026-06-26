import { workScheduleSchema } from '../../dtos/workSchedule/workScheduleSchemas';
import { AppError } from '../../errors/AppError';
import { Employee } from '../../models/Employee';
import { WorkSchedule } from '../../models/WorkSchedule';
import { AuthUser } from '../../types/auth';

interface SetWorkScheduleServiceParams {
  user?: AuthUser;
  body: unknown;
}

export const setWorkScheduleService = async ({
  user,
  body,
}: SetWorkScheduleServiceParams) => {
  if (!user || !['admin', 'sub_admin'].includes(user.role)) {
    throw new AppError('Permissao negada.', 403);
  }

  const { employeeId, customDays } = workScheduleSchema.parse(body);

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new AppError('Funcionário não encontrado.', 404);
  }

  if (employee.role !== 'employee') {
    throw new AppError(
      'Escala só pode ser criada para funcionários do tipo "employee".',
      400
    );
  }

  if (
    user.role === 'sub_admin' &&
    String(employee.companyId) !== String(user.companyId)
  ) {
    throw new AppError(
      'Você só pode gerenciar funcionários da sua empresa.',
      403
    );
  }

  const existingSchedule = await WorkSchedule.findOne({ employeeId });

  if (existingSchedule) {
    existingSchedule.customDays = customDays;
    await existingSchedule.save();

    return {
      statusCode: 200,
      body: {
        message: 'Escala atualizada com sucesso.',
        schedule: existingSchedule,
      },
    };
  }

  const newSchedule = new WorkSchedule({ employeeId, customDays });
  await newSchedule.save();

  return {
    statusCode: 201,
    body: {
      message: 'Escala criada com sucesso.',
      schedule: newSchedule,
    },
  };
};
