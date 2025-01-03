import moment from "moment-timezone";

export const calculateWorkHours = (record: any, dailyHours: number = 8) => {
  const clockIn = record.clockIn
    ? moment.tz(record.clockIn, "America/Sao_Paulo").toDate().getTime()
    : 0;
  const clockOut = record.clockOut
    ? moment.tz(record.clockOut, "America/Sao_Paulo").toDate().getTime()
    : 0;
  const lunchStart = record.lunchStart
    ? moment.tz(record.lunchStart, "America/Sao_Paulo").toDate().getTime()
    : 0;
  const lunchEnd = record.lunchEnd
    ? moment.tz(record.lunchEnd, "America/Sao_Paulo").toDate().getTime()
    : 0;

  if (!clockIn || !clockOut) {
    return { workedHours: "N/A", balance: "N/A" };
  }

  const workedTime = clockOut - clockIn - (lunchEnd - lunchStart);
  const workedHours = workedTime / (1000 * 60 * 60);
  const balance = workedHours - dailyHours;

  return {
    workedHours: `${Math.floor(workedHours)}h ${Math.round(
      (workedHours % 1) * 60
    )}m`,
    balance: `${balance >= 0 ? "+" : ""}${Math.floor(balance)}h ${Math.round(
      (balance % 1) * 60
    )}m`,
  };
};
