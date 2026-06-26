import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { absenceSchema } from '../../dtos/absence/absenceSchemas';
import { AppError } from '../../errors/AppError';
import { Absence } from '../../models/Absence';
import { Employee } from '../../models/Employee';
import { TimeRecord } from '../../models/TimeRecord';
import { WorkSchedule } from '../../models/WorkSchedule';
import { AuthUser } from '../../types/auth';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/Sao_Paulo');

interface CreateOrUpdateAbsenceServiceParams {
  user?: AuthUser;
  body: unknown;
}

export const createOrUpdateAbsenceService = async ({
  user,
  body,
}: CreateOrUpdateAbsenceServiceParams) => {
  if (!user || user.role !== 'sub_admin') {
    throw new AppError('Apenas sub_admin pode registrar ausências.', 403);
  }

  const data = absenceSchema.parse(body);

  const employee = await Employee.findById(data.employeeId);
  if (!employee || String(employee.companyId) !== String(user.companyId)) {
    throw new AppError('Funcionário não pertence à sua empresa.', 403);
  }

  const employeeCreatedAt = dayjs(employee.createdAt).startOf('day');
  const requestedAbsenceDate = dayjs.tz(data.date).startOf('day');

  if (requestedAbsenceDate.isBefore(employeeCreatedAt)) {
    throw new AppError(
      `A ausência não pode ser registrada antes do vínculo do funcionário com a empresa (${employeeCreatedAt.format('DD/MM/YYYY')}).`,
      400
    );
  }

  const schedule = await WorkSchedule.findOne({ employeeId: employee._id });
  if (!schedule) {
    throw new AppError(
      'Escala de trabalho não encontrada para o funcionário.',
      400
    );
  }

  const date = dayjs.tz(data.date);
  const today = dayjs().tz();

  if (date.isSame(today, 'day') || date.isAfter(today)) {
    throw new AppError(
      'Só é permitido registrar ausência para datas passadas.',
      400
    );
  }

  const existingTimeRecord = await TimeRecord.findOne({
    employeeId: data.employeeId,
    date: data.date,
  });

  if (existingTimeRecord) {
    const missingPunches =
      !existingTimeRecord.clockIn ||
      !existingTimeRecord.lunchStart ||
      !existingTimeRecord.lunchEnd ||
      !existingTimeRecord.clockOut;

    const workedSeconds = existingTimeRecord.workedSeconds || 0;
    const dayOfWeek = date.format('dddd').toLowerCase();
    const daySchedule = schedule.customDays.find(
      (d) => d.day.toLowerCase() === dayOfWeek
    );

    const expectedSeconds = daySchedule
      ? dayjs(daySchedule.end, 'HH:mm').diff(
          dayjs(daySchedule.start, 'HH:mm'),
          'second'
        ) -
        (daySchedule.hasLunch
          ? (daySchedule.expectedLunchBreakMinutes || 0) * 60
          : 0)
      : 0;

    if (!missingPunches && workedSeconds >= expectedSeconds) {
      throw new AppError(
        'Não é possível justificar uma jornada completa válida ou com saldo positivo (hora extra).',
        400
      );
    }
  }

  const existingAbsence = await Absence.findOne({
    employeeId: data.employeeId,
    date: data.date,
  });

  if (existingAbsence) {
    existingAbsence.type = data.type;
    existingAbsence.description = data.description;
    await existingAbsence.save();

    return {
      statusCode: 200,
      body: existingAbsence,
    };
  }

  const absence = new Absence({
    ...data,
    companyId: user.companyId,
    createdBy: user.id,
  });

  await absence.save();

  return {
    statusCode: 201,
    body: absence,
  };
};
