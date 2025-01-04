import moment from 'moment-timezone';

interface DateFilter {
  clockIn: { $gte: Date; $lte: Date };
}

export const getDateFilter = (
  startDate?: string,
  endDate?: string,
  period?: string
): DateFilter => {
  const timezone = 'America/Sao_Paulo';
  let start: Date | undefined;
  let end: Date | undefined;

  if (startDate && endDate) {
    start = moment.tz(startDate, timezone).startOf('day').toDate();
    end = moment.tz(endDate, timezone).endOf('day').toDate();
  } else {
    const now = moment.tz(timezone);
    switch (period) {
      case 'day':
        start = now.clone().startOf('day').toDate();
        end = now.clone().endOf('day').toDate();
        break;
      case 'week':
        start = now.clone().startOf('week').toDate();
        end = now.clone().endOf('week').toDate();
        break;
      case 'month':
        start = now.clone().startOf('month').toDate();
        end = now.clone().endOf('month').toDate();
        break;
      case 'year':
        start = now.clone().startOf('year').toDate();
        end = now.clone().endOf('year').toDate();
        break;
      default:
        throw new Error(
          `Parâmetros inválidos. Forneça 'startDate' e 'endDate' ou um 'period' válido ('day', 'week', 'month', 'year').`
        );
    }
  }

  if (!start || !end) {
    throw new Error(
      `Parâmetros inválidos. Forneça 'startDate' e 'endDate' ou um 'period' válido ('day', 'week', 'month', 'year').`
    );
  }

  return { clockIn: { $gte: start, $lte: end } };
};
