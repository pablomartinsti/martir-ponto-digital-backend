import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { WorkSchedule } from '../../models/WorkSchedule';
import { AuthUser } from '../../types/auth';
import { updateTimeRecordSchema } from '../../dtos/timeRecord/timeRecordSchemas';
import { AppError } from '../../errors/AppError';
import {
  BRAZIL_TIMEZONE,
  ensureAuthenticatedUser,
  findActiveEmployeeOrFail,
  findCompanyOrFail,
  findOwnTimeRecordOrFail,
  validateEmployeeLocationOrFail,
} from './timeRecordHelpers';

dayjs.extend(utc);
dayjs.extend(timezone);

type TimeRecordField = 'lunchStart' | 'lunchEnd' | 'clockOut';

interface UpdateTimeRecordFieldServiceInput {
  user?: AuthUser;
  body: unknown;
  field: TimeRecordField;
}

const validateTimeRecordFlow = async (
  field: TimeRecordField,
  timeRecord: any
) => {
  if (!timeRecord.clockIn) {
    throw new AppError('Entrada ainda nao registrada.', 400);
  }

  if (timeRecord.clockOut) {
    throw new AppError('Jornada ja finalizada hoje.', 400);
  }

  if (field === 'lunchStart') {
    if (timeRecord.lunchStart) {
      throw new AppError('Saida para almoco ja registrada hoje.', 400);
    }
    return;
  }

  if (field === 'lunchEnd') {
    if (!timeRecord.lunchStart) {
      throw new AppError('Saida para almoco ainda nao registrada.', 400);
    }

    if (timeRecord.lunchEnd) {
      throw new AppError('Retorno do almoco ja registrado hoje.', 400);
    }

    const schedule = await WorkSchedule.findOne({
      employeeId: timeRecord.employeeId,
    });

    const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
      .format(new Date(`${timeRecord.date}T00:00:00`))
      .toLowerCase();

    const todaySchedule = schedule?.customDays.find(
      (day) => day.day.toLowerCase() === dayOfWeek
    );
    const expectedBreakMinutes = todaySchedule?.expectedLunchBreakMinutes || 0;

    const diffInMs =
      dayjs().tz(BRAZIL_TIMEZONE).toDate().getTime() -
      new Date(timeRecord.lunchStart).getTime();
    const diffInMinutes = diffInMs / 60000;

    if (diffInMinutes < expectedBreakMinutes) {
      throw new AppError(
        `Tempo minimo de intervalo para almoco: ${expectedBreakMinutes} minutos.`,
        403
      );
    }

    return;
  }

  if (field === 'clockOut') {
    if (timeRecord.lunchStart && !timeRecord.lunchEnd) {
      throw new AppError('Retorno do almoco ainda nao registrado.', 400);
    }
  }
};

export const updateTimeRecordFieldService = async ({
  user,
  body,
  field,
}: UpdateTimeRecordFieldServiceInput) => {
  const authenticatedUser = ensureAuthenticatedUser(user);
  const { recordId, latitude, longitude } = updateTimeRecordSchema.parse(body);

  const timeRecord = await findOwnTimeRecordOrFail(
    recordId,
    authenticatedUser.id
  );
  const employee = await findActiveEmployeeOrFail(
    String(timeRecord.employeeId)
  );
  const company = await findCompanyOrFail(employee.companyId);

  validateEmployeeLocationOrFail(
    latitude,
    longitude,
    company.latitude,
    company.longitude,
    'registrar o ponto'
  );

  await validateTimeRecordFlow(field, timeRecord);

  timeRecord[field] = dayjs().tz(BRAZIL_TIMEZONE).toDate();
  await timeRecord.save();

  return timeRecord;
};
