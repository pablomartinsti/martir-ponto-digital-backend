import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { TimeRecord } from '../../models/TimeRecord';
import { AuthUser } from '../../types/auth';
import { BRAZIL_TIMEZONE, ensureAuthenticatedUser } from './timeRecordHelpers';

dayjs.extend(utc);
dayjs.extend(timezone);

interface GetTodayTimeRecordServiceInput {
  user?: AuthUser;
}

export const getTodayTimeRecordService = async ({
  user,
}: GetTodayTimeRecordServiceInput) => {
  const authenticatedUser = ensureAuthenticatedUser(user);
  const today = dayjs().tz(BRAZIL_TIMEZONE).format('YYYY-MM-DD');

  const record = await TimeRecord.findOne({
    employeeId: authenticatedUser.id,
    date: today,
  });

  return { record: record || null };
};
