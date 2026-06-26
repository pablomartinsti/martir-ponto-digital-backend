import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { TimeRecord } from '../../models/TimeRecord';
import { AuthUser } from '../../types/auth';
import { clockInSchema } from '../../dtos/timeRecord/timeRecordSchemas';
import { AppError } from '../../errors/AppError';
import {
  BRAZIL_TIMEZONE,
  ensureAuthenticatedUser,
  findActiveEmployeeOrFail,
  findCompanyOrFail,
  findTodayScheduleOrFail,
  validateEmployeeLocationOrFail,
} from './timeRecordHelpers';

dayjs.extend(utc);
dayjs.extend(timezone);

interface ClockInServiceInput {
  user?: AuthUser;
  body: unknown;
}

export const clockInService = async ({ user, body }: ClockInServiceInput) => {
  const authenticatedUser = ensureAuthenticatedUser(user);
  const { latitude, longitude } = clockInSchema.parse(body);
  const employeeId = authenticatedUser.id;

  const employee = await findActiveEmployeeOrFail(employeeId);
  const company = await findCompanyOrFail(employee.companyId);
  const { now, todaySchedule } = await findTodayScheduleOrFail(employeeId);

  validateEmployeeLocationOrFail(
    latitude,
    longitude,
    company.latitude,
    company.longitude,
    'bater o ponto'
  );

  const [hour, minute] = todaySchedule.start.split(':').map(Number);
  const startAllowed = now
    .clone()
    .set('hour', hour)
    .set('minute', minute)
    .set('second', 0)
    .set('millisecond', 0);
  const fiveMinutesBefore = startAllowed.subtract(5, 'minute');

  if (now.isBefore(fiveMinutesBefore)) {
    throw new AppError(
      'Voce ainda nao pode iniciar a jornada. E permitido bater ponto ate 5 minutos antes do horario da escala.',
      403
    );
  }

  const today = now.format('YYYY-MM-DD');
  const existingRecord = await TimeRecord.findOne({ employeeId, date: today });

  if (existingRecord?.clockIn) {
    throw new AppError('Jornada ja iniciada hoje.', 400);
  }

  return TimeRecord.findOneAndUpdate(
    { employeeId, date: today },
    {
      $set: {
        clockIn: now.toDate(),
        location: { latitude, longitude },
        date: today,
      },
    },
    { new: true, upsert: true }
  );
};
