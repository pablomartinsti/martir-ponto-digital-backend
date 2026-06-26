import dayjs from 'dayjs';
import { Employee } from '../../models/Employee';
import { AuthUser } from '../../types/auth';
import { getTimeRecordsSchema } from '../../dtos/timeRecord/timeRecordSchemas';
import { AppError } from '../../errors/AppError';
import { getAggregatedTimeRecords } from '../../utils/timeRecordAggregation';
import { ensureAuthenticatedUser } from './timeRecordHelpers';

interface GetTimeRecordsServiceInput {
  user?: AuthUser;
  query: unknown;
}

export const getTimeRecordsService = async ({
  user,
  query,
}: GetTimeRecordsServiceInput) => {
  const authenticatedUser = ensureAuthenticatedUser(user);
  const { startDate, endDate, period, employeeId } =
    getTimeRecordsSchema.parse(query);

  let consultedEmployeeId: string;
  let employee;

  if (authenticatedUser.role === 'admin') {
    if (!employeeId) {
      throw new AppError('employeeId e obrigatorio para admin.', 400);
    }

    consultedEmployeeId = employeeId;
    employee = await Employee.findById(employeeId);

    if (!employee) {
      throw new AppError('Funcionario nao encontrado.', 404);
    }
  } else if (authenticatedUser.role === 'sub_admin') {
    if (!employeeId) {
      throw new AppError('employeeId e obrigatorio para sub_admin.', 400);
    }

    employee = await Employee.findById(employeeId);

    if (!employee || String(employee.companyId) !== authenticatedUser.companyId) {
      throw new AppError(
        'Permissao negada. Funcionario nao pertence a sua empresa.',
        403
      );
    }

    consultedEmployeeId = employeeId;
  } else if (authenticatedUser.role === 'employee') {
    consultedEmployeeId = authenticatedUser.id;
    employee = await Employee.findById(authenticatedUser.id);

    if (!employee) {
      throw new AppError('Funcionario nao encontrado.', 404);
    }
  } else {
    throw new AppError('Permissao negada.', 403);
  }

  const inputStart = dayjs(startDate).startOf('day');
  const inputEnd = dayjs(endDate).endOf('day');
  const createdAt = dayjs(employee.createdAt).startOf('day');
  const adjustedStart = inputStart.isBefore(createdAt) ? createdAt : inputStart;

  const records = await getAggregatedTimeRecords(
    consultedEmployeeId,
    adjustedStart.format('YYYY-MM-DD'),
    inputEnd.format('YYYY-MM-DD'),
    period
  );

  if (!records.records || records.records.length === 0) {
    return {
      ...records,
      records: [],
      message: records.message || records.error || 'Nenhum registro encontrado.',
    };
  }

  return records;
};
