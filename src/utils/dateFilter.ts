import moment from "moment-timezone";

export const getDateFilter = (
  startDate?: string,
  endDate?: string,
  period?: string
): { clockIn: { $gte: Date; $lte: Date } } => {
  let start: Date | undefined;
  let end: Date | undefined;

  if (startDate && endDate) {
    // Caso `startDate` e `endDate` sejam fornecidos
    start = moment.tz(startDate, "America/Sao_Paulo").startOf("day").toDate();
    end = moment.tz(endDate, "America/Sao_Paulo").endOf("day").toDate();
  } else if (period === "day") {
    start = moment.tz("America/Sao_Paulo").startOf("day").toDate();
    end = moment.tz("America/Sao_Paulo").endOf("day").toDate();
  } else if (period === "week") {
    const today = moment.tz("America/Sao_Paulo");
    start = today.clone().startOf("week").toDate();
    end = today.clone().endOf("week").toDate();
  } else if (period === "month") {
    const now = moment.tz("America/Sao_Paulo");
    start = now.clone().startOf("month").toDate();
    end = now.clone().endOf("month").toDate();
  } else if (period === "year") {
    const now = moment.tz("America/Sao_Paulo");
    start = now.clone().startOf("year").toDate();
    end = now.clone().endOf("year").toDate();
  }

  if (!start || !end) {
    throw new Error(
      `Parâmetros inválidos. Forneça 'startDate' e 'endDate' ou um 'period' válido ('day', 'week', 'month', 'year').`
    );
  }

  return { clockIn: { $gte: start, $lte: end } };
};
