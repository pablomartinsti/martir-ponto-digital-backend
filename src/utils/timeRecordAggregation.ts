import { TimeRecord } from '../models/TimeRecord';
import { WorkSchedule } from '../models/WorkSchedule';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata um número decimal de horas para o formato `hh:mm`
 */
const formatHours = (decimalHours: number): string => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
};

/**
 * Converte a data para o formato correto no fuso horário do Brasil
 */
const formatDate = (date: Date): string => {
  return dayjs(date).tz(TIMEZONE).format('DD/MM/YYYY HH:mm');
};

export const getAggregatedTimeRecords = async (
  employeeId: string,
  startDate: string,
  endDate: string,
  period: 'day' | 'week' | 'month' | 'year'
) => {
  const start = dayjs(startDate).tz(TIMEZONE).startOf('day').toDate();
  const end = dayjs(endDate).tz(TIMEZONE).endOf('day').toDate();

  // 🔎 Buscar escala do funcionário
  const schedule = await WorkSchedule.findOne({ employeeId });

  if (!schedule) {
    throw new Error('Escala de trabalho não encontrada.');
  }

  // 📅 Estruturando escala do funcionário por dia da semana
  const scheduleHoursPerDay = schedule.customDays.reduce(
    (acc, day) => {
      acc[day.day.toLowerCase()] = day.dailyHours;
      return acc;
    },
    {} as { [key: string]: number }
  );

  const matchStage = {
    $match: {
      employeeId: new mongoose.Types.ObjectId(employeeId),
      clockIn: { $gte: start, $lte: end },
    },
  };

  const addFieldsStage = {
    $addFields: {
      totalWorkedMilliseconds: {
        $subtract: [{ $ifNull: ['$clockOut', new Date()] }, '$clockIn'],
      },
      lunchBreakMilliseconds: {
        $cond: {
          if: { $and: ['$lunchStart', '$lunchEnd'] },
          then: { $subtract: ['$lunchEnd', '$lunchStart'] },
          else: 0,
        },
      },
      workedMilliseconds: {
        $subtract: [
          {
            $subtract: [{ $ifNull: ['$clockOut', new Date()] }, '$clockIn'],
          },
          {
            $cond: {
              if: { $and: ['$lunchStart', '$lunchEnd'] },
              then: { $subtract: ['$lunchEnd', '$lunchStart'] },
              else: 0,
            },
          },
        ],
      },
    },
  };

  let groupStage: any;

  switch (period) {
    case 'day':
      groupStage = {
        $group: {
          _id: {
            day: { $dayOfMonth: '$clockIn' },
            month: { $month: '$clockIn' },
            year: { $year: '$clockIn' },
            dayOfWeek: { $dayOfWeek: '$clockIn' },
          },
          records: {
            $push: {
              _id: '$_id',
              clockIn: '$clockIn',
              lunchStart: '$lunchStart',
              lunchEnd: '$lunchEnd',
              clockOut: '$clockOut',
              location: '$location',
              workedHours: {
                $divide: ['$workedMilliseconds', 3600000], // Convertendo para horas decimais
              },
            },
          },
        },
      };
      break;

    case 'week':
    case 'month':
    case 'year':
      groupStage = {
        $group: {
          _id:
            period === 'week'
              ? {
                  week: { $isoWeek: '$clockIn' },
                  year: { $isoWeekYear: '$clockIn' },
                }
              : period === 'month'
                ? {
                    day: { $dayOfMonth: '$clockIn' },
                    month: { $month: '$clockIn' },
                    year: { $year: '$clockIn' },
                  }
                : {
                    year: { $year: '$clockIn' },
                    month: { $month: '$clockIn' },
                  },
          records: { $push: '$$ROOT' },
        },
      };
      break;

    default:
      throw new Error('Período inválido.');
  }

  const sortStage = {
    $sort: { 'period.year': 1, 'period.month': 1, 'period.day': 1 },
  };

  // ✅ **Correção: cálculo do saldo no backend**
  const aggregationResults = await TimeRecord.aggregate([
    matchStage,
    addFieldsStage,
    groupStage,
    sortStage,
  ]);

  // ✅ **Cálculo dos totais**
  let totalPositiveHours = 0;
  let totalNegativeHours = 0;

  const updatedResults = aggregationResults.map((result: any) => {
    let dayPositiveHours = 0;
    let dayNegativeHours = 0;

    const updatedRecords = result.records.map((record: any) => {
      const dayOfWeek = dayjs(record.clockIn).format('dddd').toLowerCase();
      const expectedHours = scheduleHoursPerDay[dayOfWeek] || 0;
      const workedHours = record.workedHours;
      const balance = workedHours - expectedHours;

      if (balance > 0) {
        dayPositiveHours += balance;
      } else {
        dayNegativeHours += Math.abs(balance);
      }

      return {
        _id: record._id,
        clockIn: formatDate(record.clockIn), // 📅 Ajustado para fuso horário Brasil
        lunchStart: formatDate(record.lunchStart), // 📅 Ajustado para fuso horário Brasil
        lunchEnd: formatDate(record.lunchEnd), // 📅 Ajustado para fuso horário Brasil
        clockOut: formatDate(record.clockOut), // 📅 Ajustado para fuso horário Brasil
        location: record.location,
        workedHours: formatHours(workedHours), // ⏳ Convertendo para `hh:mm`
        balance: formatHours(balance), // ⏳ Convertendo para `hh:mm`
      };
    });

    totalPositiveHours += dayPositiveHours;
    totalNegativeHours += dayNegativeHours;

    return {
      _id: result._id,
      records: updatedRecords,
    };
  });

  // 📊 **Cálculo final do saldo do período**
  const finalBalance = totalPositiveHours - totalNegativeHours;

  return {
    period: {
      startDate,
      endDate,
      type: period,
    },
    results: updatedResults,
    totalPositiveHours: formatHours(totalPositiveHours), // ⏳ Convertendo para `hh:mm`
    totalNegativeHours: formatHours(totalNegativeHours), // ⏳ Convertendo para `hh:mm`
    finalBalance: formatHours(finalBalance), // ⏳ Convertendo para `hh:mm`
  };
};
