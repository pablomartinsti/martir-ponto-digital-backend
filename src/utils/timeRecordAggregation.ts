import { TimeRecord } from '../models/TimeRecord';
import { WorkSchedule } from '../models/WorkSchedule';
import mongoose from 'mongoose';

// ✅ Converte decimal para "HH:mm"
const formatHours = (decimalHours: number): string => {
  if (isNaN(decimalHours)) return '00:00';
  const hours = Math.floor(Math.abs(decimalHours));
  const minutes = Math.round((Math.abs(decimalHours) - hours) * 60);
  return `${decimalHours < 0 ? '-' : ''}${hours.toString().padStart(2, '0')}:${minutes
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
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const schedule = await WorkSchedule.findOne({ employeeId });

  if (!schedule) {
    throw new Error('Escala de trabalho não encontrada.');
  }

  const scheduleHoursPerDay = schedule.customDays.reduce(
    (acc, day) => {
      acc[day.day.toLowerCase()] = day.dailyHours;
      return acc;
    },
    {} as { [key: string]: number }
  );

  const aggregationResults = await TimeRecord.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: startDate, $lte: endDate }, // ✅ Usa 'date' em vez de 'clockIn'
      },
    },
    {
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
    },
    {
      $group: {
        _id:
          period === 'month'
            ? { month: { $month: '$clockIn' }, year: { $year: '$clockIn' } }
            : period === 'week'
              ? {
                  week: { $isoWeek: '$clockIn' },
                  year: { $isoWeekYear: '$clockIn' },
                }
              : {
                  day: { $dayOfMonth: '$clockIn' },
                  month: { $month: '$clockIn' },
                  year: { $year: '$clockIn' },
                },
        records: {
          $push: {
            _id: '$_id',
            clockIn: '$clockIn',
            lunchStart: '$lunchStart',
            lunchEnd: '$lunchEnd',
            clockOut: '$clockOut',
            location: '$location',
            workedHours: { $divide: ['$workedMilliseconds', 3600000] }, // Convertendo milissegundos para horas decimais
          },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } },
  ]);

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
      const workedHours = isNaN(record.workedHours) ? 0 : record.workedHours;
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
        workedHours: formatHours(workedHours), // ✅ Agora "HH:mm"
        balance: formatHours(balance), // ✅ Agora "HH:mm"
      };
    });

    totalPositiveHours += weekPositiveHours;
    totalNegativeHours += weekNegativeHours;

    return {
      _id: result._id,
      records: updatedRecords,
    };
  });

  const finalBalance = totalPositiveHours - totalNegativeHours;

  return {
    period: {
      startDate,
      endDate,
      type: period,
    },
    results: updatedResults,
    totalPositiveHours: formatHours(totalPositiveHours), // ✅ Agora "HH:mm"
    totalNegativeHours: formatHours(totalNegativeHours), // ✅ Agora "HH:mm"
    finalBalance: formatHours(finalBalance), // ✅ Agora "HH:mm"
  };
};
