import { TimeRecord } from '../models/TimeRecord';
import { WorkSchedule } from '../models/WorkSchedule';
import mongoose from 'mongoose';

const formatHours = (decimalHours: number): string => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
};

export const getAggregatedTimeRecords = async (
  employeeId: string,
  startDate: string,
  endDate: string,
  period: 'day' | 'week' | 'month' | 'year'
) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0); // Define início do dia

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Define fim do dia

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
      clockIn: {
        $exists: true,
        $gte: new Date(`${startDate}T00:00:00.000Z`), // ✅ Busca a partir da data inicial
        $lte: new Date(`${endDate}T23:59:59.999Z`), // ✅ Inclui a data final
      },
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
      groupStage = {
        $group: {
          _id: {
            week: { $isoWeek: '$clockIn' }, // Agrupar por semana ISO
            year: { $isoWeekYear: '$clockIn' },
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
                $divide: ['$workedMilliseconds', 3600000],
              },
            },
          },
        },
      };
      break;

    case 'month':
      groupStage = {
        $group: {
          _id: {
            month: { $month: '$clockIn' },
            year: { $year: '$clockIn' },
          },
          records: { $push: '$$ROOT' },
        },
      };
      break;

    case 'year':
      groupStage = {
        $group: {
          _id: {
            year: { $year: '$clockIn' },
          },
          records: { $push: '$$ROOT' },
        },
      };
      break;

    default:
      throw new Error('Período inválido.');
  }

  const sortStage = {
    $sort: { '_id.year': 1, '_id.week': 1 },
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
    let weekPositiveHours = 0;
    let weekNegativeHours = 0;

    const updatedRecords = result.records.map((record: any) => {
      const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
        .format(new Date(record.clockIn))
        .toLowerCase();
      const expectedHours = scheduleHoursPerDay[dayOfWeek] || 0;
      const workedHours = record.workedHours;
      const balance = workedHours - expectedHours;

      if (balance > 0) {
        weekPositiveHours += balance;
      } else {
        weekNegativeHours += Math.abs(balance);
      }

      return {
        _id: record._id,
        clockIn: record.clockIn ? record.clockIn.toISOString() : null,
        lunchStart: record.lunchStart ? record.lunchStart.toISOString() : null,
        lunchEnd: record.lunchEnd ? record.lunchEnd.toISOString() : null,
        clockOut: record.clockOut ? record.clockOut.toISOString() : null,
        location: record.location,
        workedHours: formatHours(workedHours),
        balance: formatHours(balance),
      };
    });

    totalPositiveHours += weekPositiveHours;
    totalNegativeHours += weekNegativeHours;

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
