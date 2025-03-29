import { TimeRecord } from '../models/TimeRecord';
import { WorkSchedule } from '../models/WorkSchedule';
import mongoose from 'mongoose';

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
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $addFields: {
        clockInLocal: {
          $subtract: ['$clockIn', 1000 * 60 * 60 * 3], // Ajuste para UTC-3
        },
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
          period === 'year'
            ? {
                year: { $year: '$clockInLocal' },
                month: { $month: '$clockInLocal' },
              }
            : period === 'month'
              ? {
                  month: { $month: '$clockInLocal' },
                  year: { $year: '$clockInLocal' },
                }
              : period === 'week'
                ? {
                    week: { $isoWeek: '$clockInLocal' },
                    year: { $isoWeekYear: '$clockInLocal' },
                  }
                : {
                    day: { $dayOfMonth: '$clockInLocal' },
                    month: { $month: '$clockInLocal' },
                    year: { $year: '$clockInLocal' },
                  },
        ...(period === 'year'
          ? { totalWorkedMilliseconds: { $sum: '$workedMilliseconds' } }
          : {
              records: {
                $push: {
                  _id: '$_id',
                  clockIn: '$clockIn',
                  lunchStart: '$lunchStart',
                  lunchEnd: '$lunchEnd',
                  clockOut: '$clockOut',
                  location: '$location',
                  workedHours: { $divide: ['$workedMilliseconds', 3600000] },
                },
              },
            }),
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);

  let totalPositiveHours = 0;
  let totalNegativeHours = 0;

  const updatedResults = aggregationResults.map((result: any) => {
    if (period === 'year') {
      const year = result._id.year;
      const month = result._id.month;

      let expectedHoursInMonth = 0;
      let workedHours = result.totalWorkedMilliseconds / (1000 * 60 * 60);

      for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month - 1, day);
        if (date.getMonth() + 1 !== month) break;

        const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
          .format(date)
          .toLowerCase();

        expectedHoursInMonth += scheduleHoursPerDay[dayOfWeek] || 0;
      }

      const balance = workedHours - expectedHoursInMonth;
      totalPositiveHours += Math.max(balance, 0);
      totalNegativeHours += Math.max(-balance, 0);

      return {
        _id: result._id,
        totalWorkedHours: formatHours(workedHours),
        expectedHours: formatHours(expectedHoursInMonth),
        totalPositiveHours: formatHours(Math.max(balance, 0)),
        totalNegativeHours: formatHours(Math.max(-balance, 0)),
        finalBalance: formatHours(balance),
      };
    }

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

  const finalBalance = totalPositiveHours - totalNegativeHours;

  return {
    period: {
      startDate,
      endDate,
      type: period,
    },
    results: updatedResults,
    totalPositiveHours: formatHours(totalPositiveHours),
    totalNegativeHours: formatHours(totalNegativeHours),
    finalBalance: formatHours(finalBalance),
  };
};
