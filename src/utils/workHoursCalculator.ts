import moment from 'moment-timezone';

interface TimeRecord {
  clockIn?: Date;
  clockOut?: Date;
  lunchStart?: Date;
  lunchEnd?: Date;
}

interface WorkSchedule {
  [day: string]: number; // Escala diária em horas (exemplo: monday: 8, tuesday: 9)
}

export const calculateWorkHours = (
  record: TimeRecord,
  workSchedule: WorkSchedule // Escala personalizada para o funcionário
): { workedHours: string; balance: string } => {
  const timezone = 'America/Sao_Paulo';

  // Obter timestamps ajustados ao fuso horário
  const clockIn = record.clockIn
    ? moment.tz(record.clockIn, timezone).valueOf()
    : 0;
  const clockOut = record.clockOut
    ? moment.tz(record.clockOut, timezone).valueOf()
    : 0;
  const lunchStart = record.lunchStart
    ? moment.tz(record.lunchStart, timezone).valueOf()
    : 0;
  const lunchEnd = record.lunchEnd
    ? moment.tz(record.lunchEnd, timezone).valueOf()
    : 0;

  // Validar se os horários de entrada e saída estão presentes
  if (!clockIn || !clockOut) {
    return { workedHours: 'N/A', balance: 'N/A' };
  }

  // Identificar o dia da semana
  const dayOfWeek = moment
    .tz(record.clockIn, timezone)
    .format('dddd')
    .toLowerCase();
  const dailyHours = workSchedule[dayOfWeek] || 0; // Horas configuradas para o dia ou 0 por padrão

  // Calcular o tempo total trabalhado (em milissegundos)
  const workedTime = clockOut - clockIn - (lunchEnd - lunchStart);

  // Converter milissegundos para horas trabalhadas
  const workedHours = workedTime / (1000 * 60 * 60);

  // Calcular o saldo
  const balance = workedHours - dailyHours;

  // Função para formatar horas e minutos
  const formatTime = (time: number) => {
    const hours = Math.floor(Math.abs(time));
    const minutes = Math.round((Math.abs(time) % 1) * 60);
    return `${hours}h ${minutes}m`;
  };

  // Determinar se é "horas extra" ou "horas falta"
  const balanceLabel = balance >= 0 ? '+' : '-';

  return {
    workedHours: formatTime(workedHours),
    balance: `(${balanceLabel}) ${formatTime(balance)}`,
  };
};

export const calculateTotalHours = (
  records: TimeRecord[],
  workSchedule: WorkSchedule
): {
  totalPositiveHours: string;
  totalNegativeHours: string;
  finalBalance: string;
} => {
  let totalPositive = 0;
  let totalNegative = 0;

  records.forEach((record) => {
    const { balance } = calculateWorkHours(record, workSchedule); // Obter o saldo diário

    console.log('Balance (String):', balance);

    // Extrair horas e minutos do saldo diário
    const match = balance.match(/\((\+|-)\)\s?(\d+)h\s?(\d+)m/);
    if (match) {
      const sign = match[1] === '+' ? 1 : -1;
      const hours = parseInt(match[2], 10);
      const minutes = parseInt(match[3], 10) / 60;

      const balanceValue = sign * (hours + minutes); // Converter saldo para número decimal
      console.log('Parsed Balance Value (Decimal):', balanceValue);

      if (balanceValue > 0) {
        totalPositive += balanceValue; // Somar horas positivas
      } else {
        totalNegative += Math.abs(balanceValue); // Somar horas negativas
      }
    }
  });

  console.log('Total Positive (Decimal):', totalPositive);
  console.log('Total Negative (Decimal):', totalNegative);

  // Calcular o saldo final
  const finalBalance = totalPositive - totalNegative;

  // Função para formatar horas e minutos
  const formatTime = (time: number) => {
    const hours = Math.floor(Math.abs(time));
    const minutes = Math.round((Math.abs(time) % 1) * 60);
    return `${hours}h ${minutes}m`;
  };

  return {
    totalPositiveHours: formatTime(totalPositive),
    totalNegativeHours: formatTime(totalNegative),
    finalBalance: `${finalBalance >= 0 ? '+' : '-'} ${formatTime(
      Math.abs(finalBalance)
    )}`,
  };
};
