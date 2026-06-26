import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { Company } from '../../models/Company';
import { Employee } from '../../models/Employee';
import { TimeRecord } from '../../models/TimeRecord';
import { WorkSchedule } from '../../models/WorkSchedule';
import { AppError } from '../../errors/AppError';
import { validateLocation } from '../../utils/validateLocation';
import { AuthUser } from '../../types/auth';

dayjs.extend(utc);
dayjs.extend(timezone);

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

export const ensureAuthenticatedUser = (user?: AuthUser): AuthUser => {
  if (!user) {
    throw new AppError('Usuario nao autenticado.', 401);
  }

  return user;
};

export const findActiveEmployeeOrFail = async (employeeId: string) => {
  const employee = await Employee.findById(employeeId);

  if (!employee) {
    throw new AppError('Funcionario nao encontrado.', 404);
  }

  if (!employee.isActive) {
    throw new AppError('Funcionario desativado.', 403);
  }

  return employee;
};

export const findCompanyOrFail = async (companyId: unknown) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new AppError('Empresa vinculada nao encontrada.', 404);
  }

  return company;
};

export const validateEmployeeLocationOrFail = (
  latitude: number,
  longitude: number,
  companyLatitude: number,
  companyLongitude: number,
  messageAction: string
) => {
  const { isValid, distance } = validateLocation(
    latitude,
    longitude,
    companyLatitude,
    companyLongitude
  );

  if (!isValid) {
    throw new AppError(
      `Voce esta a ${distance} metros da empresa. Aproxime-se para ${messageAction}.`,
      403
    );
  }
};

export const findTodayScheduleOrFail = async (employeeId: string) => {
  const now = dayjs().tz(BRAZIL_TIMEZONE);
  const schedule = await WorkSchedule.findOne({ employeeId });
  const dayOfWeek = now.format('dddd').toLowerCase();
  const todaySchedule = schedule?.customDays.find(
    (day) => day.day.toLowerCase() === dayOfWeek
  );

  if (!todaySchedule || todaySchedule.isDayOff) {
    throw new AppError('Hoje e folga ou nao possui escala.', 403);
  }

  return { now, todaySchedule };
};

export const findOwnTimeRecordOrFail = async (
  recordId: string,
  userId: string
) => {
  const timeRecord = await TimeRecord.findById(recordId);

  if (!timeRecord) {
    throw new AppError('Registro de ponto nao encontrado.', 404);
  }

  if (String(timeRecord.employeeId) !== userId) {
    throw new AppError(
      'Permissao negada para alterar registro de outro funcionario.',
      403
    );
  }

  return timeRecord;
};
