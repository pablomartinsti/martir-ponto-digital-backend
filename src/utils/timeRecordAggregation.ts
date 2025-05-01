// Função responsável por agrupar e calcular registros de ponto (TimeRecords)
// com base em um período definido (dia, semana ou mês), retornando o saldo
// de horas trabalhadas, ausências, folgas e cálculo final do período.

import { TimeRecord } from '../models/TimeRecord';
import { WorkSchedule } from '../models/WorkSchedule';
import { Absence, AbsenceType } from '../models/Absence';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Employee } from '../models/Employee';

// Plugins do dayjs para lidar com fuso horário e comparação de datas
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

// Utilitário para formatar horas em formato HH:mm:ss
const formatHours = (decimalHours: number): string => {
  if (isNaN(decimalHours)) return '00:00:00';

  const isNegative = decimalHours < 0;
  const totalSeconds = Math.abs(Math.round(decimalHours * 3600));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return isNegative ? `-${formattedTime}` : formattedTime;
};

// Calcula as horas esperadas de trabalho para um dia com base na escala
function getExpectedHours(schedule: any): number {
  const [startH, startM] = schedule.start.split(':').map(Number);
  const [endH, endM] = schedule.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const totalMinutes = endMinutes - startMinutes;
  return schedule.hasLunch
    ? (totalMinutes - schedule.expectedLunchBreakMinutes) / 60
    : totalMinutes / 60;
}

// Mapeia os tipos de ausência para descrições em português
function traduzirTipoAbsence(type: AbsenceType): string {
  const map: Record<AbsenceType, string> = {
    vacation: 'Férias',
    sick_leave: 'Atestado médico',
    justified: 'Falta justificada',
    day_off: 'Folga concedida',
    holiday: 'Feriado',
    unjustified: 'Falta injustificada',
  };
  return map[type];
}

export const getAggregatedTimeRecords = async (
  employeeId: string,
  startDate: string,
  endDate: string,
  period: 'day' | 'week' | 'month'
) => {
  // Converte datas recebidas para objetos Date com fuso de São Paulo
  const start = dayjs.tz(startDate, 'America/Sao_Paulo').startOf('day');
  const end = dayjs.tz(endDate, 'America/Sao_Paulo').endOf('day');

  // 🔒 Busca o funcionário para pegar o createdAt
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return {
      period: { startDate, endDate, type: period },
      records: [],
      totalPositiveHours: '00:00:00',
      totalNegativeHours: '00:00:00',
      finalBalance: '00:00:00',
      error: 'Funcionário não encontrado.',
    };
  }
  const employeeCreatedAt = dayjs(employee.createdAt).startOf('day');

  // Busca a escala de trabalho do funcionário
  const schedule = await WorkSchedule.findOne({ employeeId });
  if (!schedule) {
    return {
      period: { startDate, endDate, type: period },
      records: [],
      totalPositiveHours: '00:00:00',
      totalNegativeHours: '00:00:00',
      finalBalance: '00:00:00',
      error: 'Escala de trabalho não encontrada.',
    };
  }

  // Transforma a escala em um objeto indexado por dia da semana
  const schedulePerDay = schedule.customDays.reduce(
    (acc, day) => {
      acc[day.day.toLowerCase()] = day;
      return acc;
    },
    {} as Record<string, any>
  );

  const formattedStart = dayjs(start).format('YYYY-MM-DD');
  const formattedEnd = dayjs(end).format('YYYY-MM-DD');

  // Busca ausências registradas no período
  const absences = await Absence.find({
    employeeId,
    date: { $gte: formattedStart, $lte: formattedEnd },
  });

  // Agregação dos registros de ponto para calcular horas trabalhadas
  const aggregationResults = await TimeRecord.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: formattedStart, $lte: formattedEnd },
      },
    },
    {
      $addFields: {
        workedMilliseconds: {
          $let: {
            vars: {
              totalWorked: {
                $subtract: [{ $ifNull: ['$clockOut', new Date()] }, '$clockIn'],
              },
              lunchBreak: {
                $cond: {
                  if: { $and: ['$lunchStart', '$lunchEnd'] },
                  then: { $subtract: ['$lunchEnd', '$lunchStart'] },
                  else: 0,
                },
              },
            },
            in: {
              $subtract: ['$$totalWorked', '$$lunchBreak'],
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        records: {
          $push: {
            _id: '$_id',
            date: '$date',
            clockIn: '$clockIn',
            lunchStart: '$lunchStart',
            lunchEnd: '$lunchEnd',
            clockOut: '$clockOut',
            location: '$location',
            workedHours: { $divide: ['$workedMilliseconds', 3600000] },
          },
        },
      },
    },
  ]);

  // Geração de todas as datas do intervalo informado
  const adjustedStart = start.isBefore(employeeCreatedAt)
    ? employeeCreatedAt
    : start;

  const adjustedEnd = end;
  const today = dayjs().tz('America/Sao_Paulo').endOf('day');

  // Gera todas as datas válidas do intervalo
  const allDates: string[] = [];
  let current = adjustedStart;

  while (
    current.isSameOrBefore(adjustedEnd, 'day') &&
    current.isSameOrBefore(today, 'day')
  ) {
    allDates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }

  // Se nenhuma data for válida, retorna mensagem clara
  if (allDates.length === 0) {
    return {
      period: {
        startDate: adjustedStart.format('YYYY-MM-DD'),
        endDate: adjustedEnd.format('YYYY-MM-DD'),
        type: period,
      },
      records: [],
      totalPositiveHours: '00:00:00',
      totalNegativeHours: '00:00:00',
      finalBalance: '00:00:00',
      message: `Nenhuma data válida a partir da entrada do funcionário (${employeeCreatedAt.format('DD/MM/YYYY')}).`,
    };
  }

  // Cria um mapa indexando os registros por data
  const recordsByDate = new Map<string, any>(
    (aggregationResults[0]?.records || []).map((rec: any) => [rec.date, rec])
  );

  let totalPositiveHours = 0;
  let totalNegativeHours = 0;

  // Mapeia os dados por data com base nos registros, ausências e escala
  const updatedRecords = allDates.map((dateStr) => {
    const record = recordsByDate.get(dateStr);
    const dateInBrazil = dayjs.tz(dateStr, 'America/Sao_Paulo');
    const dayOfWeek = dateInBrazil.format('dddd').toLowerCase();

    const daySchedule = schedulePerDay[dayOfWeek];

    const absence = absences.find(
      (a) => dayjs(a.date).format('YYYY-MM-DD') === dateStr
    );

    const expectedHours = daySchedule ? getExpectedHours(daySchedule) : 0;

    // Dia sem expediente
    if (!daySchedule || daySchedule.isDayOff) {
      return {
        _id: record?._id,
        date: dateStr,
        workedHours: formatHours(0),
        balance: formatHours(0),
        status: 'Folga',
      };
    }

    // Dia com ausência registrada
    if (absence) {
      const isNegative = absence.type === 'unjustified';
      const worked = isNegative ? 0 : expectedHours;
      const balance = isNegative ? -expectedHours : 0;

      if (isNegative) {
        totalNegativeHours += expectedHours;
      }

      return {
        _id: record?._id,
        date: dateStr,
        justified: true,
        description: absence.description || '',
        clockIn: record?.clockIn || null,
        lunchStart: record?.lunchStart || null,
        lunchEnd: record?.lunchEnd || null,
        clockOut: record?.clockOut || null,
        workedHours: formatHours(worked),
        balance: formatHours(balance),
        status: traduzirTipoAbsence(absence.type),
      };
    }

    // Dia com jornada completa
    if (
      record?.clockIn &&
      record?.lunchStart &&
      record?.lunchEnd &&
      record?.clockOut
    ) {
      const workedHours = isNaN(record.workedHours) ? 0 : record.workedHours;
      const expectedHours = daySchedule ? getExpectedHours(daySchedule) : 0;
      const balance = workedHours - expectedHours;
      const balanceInSeconds = Math.round(balance * 3600); // convertendo para segundos
      const tolerance = 600; // 10 minutos em segundos

      let status = 'Jornada completa';

      if (balanceInSeconds > tolerance) {
        totalPositiveHours += balance;
        status = 'Hora extra';
      } else if (balanceInSeconds < -tolerance) {
        totalNegativeHours += Math.abs(balance);
        status = 'Horas faltando';
      }

      return {
        _id: record?._id,
        date: dateStr,
        clockIn: record.clockIn,
        lunchStart: record.lunchStart,
        lunchEnd: record.lunchEnd,
        clockOut: record.clockOut,
        workedHours: formatHours(workedHours),
        balance: formatHours(balance),
        status,
      };
    } else {
      // Jornada incompleta (parcial)
      const parcial =
        record?.clockIn && record?.lunchStart && !record?.lunchEnd
          ? (new Date(record.lunchStart).getTime() -
              new Date(record.clockIn).getTime()) /
            3600000
          : 0;

      const balance = parcial - expectedHours;
      if (balance > 0) totalPositiveHours += balance;
      else totalNegativeHours += Math.abs(balance);

      return {
        _id: record?._id,
        date: dateStr,
        justified: true,
        clockIn: record?.clockIn || null,
        lunchStart: record?.lunchStart || null,
        lunchEnd: record?.lunchEnd || null,
        clockOut: record?.clockOut || null,
        workedHours: formatHours(parcial),
        balance: formatHours(balance),
        status: 'Jornada incompleta',
      };
    }
  });

  // Resultado final de horas positivas e negativas
  const finalBalance = totalPositiveHours - totalNegativeHours;

  return {
    period: {
      startDate,
      endDate,
      type: period,
    },
    records: updatedRecords,
    totalPositiveHours: formatHours(totalPositiveHours),
    totalNegativeHours: formatHours(totalNegativeHours),
    finalBalance: formatHours(finalBalance),
  };
};
