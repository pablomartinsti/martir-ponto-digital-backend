import { Request, Response } from "express";
import { TimeRecord } from "../models/TimeRecord";
import { Employee } from "../models/Employee";

// calculo das Horas
export const calculateWorkHours = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    let dateFilter: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.clockIn = { $gte: start, $lte: end };
    }

    if (employeeId) {
      dateFilter.employeeId = employeeId;
    }

    // Buscar registros no banco
    const records = await TimeRecord.find(dateFilter);

    // Calcular as horas trabalhadas para cada registro
    const results = records.map((record) => {
      const clockIn = record.clockIn ? new Date(record.clockIn) : null;
      const clockOut = record.clockOut ? new Date(record.clockOut) : null;
      const lunchStart = record.lunchStart ? new Date(record.lunchStart) : null;
      const lunchEnd = record.lunchEnd ? new Date(record.lunchEnd) : null;

      if (!clockIn || !clockOut) {
        return {
          record,
          workHours: "Dados insuficientes para calcular horas trabalhadas.",
        };
      }

      const totalWorkDuration = clockOut.getTime() - clockIn.getTime();
      const lunchDuration =
        lunchStart && lunchEnd ? lunchEnd.getTime() - lunchStart.getTime() : 0;

      const workHours = totalWorkDuration - lunchDuration;

      // Converter para horas e minutos
      const hours = Math.floor(workHours / (1000 * 60 * 60));
      const minutes = Math.floor((workHours % (1000 * 60 * 60)) / (1000 * 60));

      return {
        record,
        workHours: `${hours}h ${minutes}m`,
      };
    });

    res.status(200).json(results);
  } catch (error) {
    console.error("Erro ao calcular horas trabalhadas:", error);
    res.status(500).json({ error: "Erro ao calcular horas trabalhadas." });
  }
};

// Filtro por periodo
export const getTimeRecords = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { employeeId, startDate, endDate, period } = req.query;

    let dateFilter: any = {};

    console.log("Query recebida:", { employeeId, startDate, endDate, period });

    const now = new Date();
    now.setHours(23, 59, 59, 999); // Final do dia atual

    // Filtros de data baseados em startDate e endDate
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999); // Ajustar endDate para incluir todo o último dia

      // Bloquear períodos futuros
      if (start > now || end > now) {
        res.status(400).json({
          error: "Não é permitido buscar dados para períodos futuros.",
        });
        return;
      }

      dateFilter.clockIn = { $gte: start, $lte: end };
    } else if (period === "day") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      dateFilter.clockIn = { $gte: todayStart, $lte: todayEnd };
    } else if (period === "week") {
      const today = new Date();
      const firstDayOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );
      firstDayOfWeek.setHours(0, 0, 0, 0);
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      lastDayOfWeek.setHours(23, 59, 59, 999);

      dateFilter.clockIn = { $gte: firstDayOfWeek, $lte: lastDayOfWeek };
    } else if (period === "month") {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      lastDayOfMonth.setHours(23, 59, 59, 999);

      dateFilter.clockIn = { $gte: firstDayOfMonth, $lte: lastDayOfMonth };
    } else if (period === "year") {
      const now = new Date();
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      const lastDayOfYear = new Date(now.getFullYear(), 11, 31);
      lastDayOfYear.setHours(23, 59, 59, 999);

      dateFilter.clockIn = { $gte: firstDayOfYear, $lte: lastDayOfYear };
    } else {
      res.status(400).json({
        error:
          "O parâmetro 'period' deve ser 'day', 'week', 'month', 'year' ou incluir startDate e endDate.",
      });
      return;
    }

    if (employeeId) {
      dateFilter.employeeId = employeeId;
    }

    console.log("Filtro aplicado:", dateFilter);

    const records = await TimeRecord.find(dateFilter);
    res.status(200).json(records);
  } catch (error) {
    console.error("Erro no controlador getTimeRecords:", error);
    res.status(500).json({ error: "Erro ao buscar registros de tempo" });
  }
};

// Registrar entrada (clock-in)
export const clockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, latitude, longitude } = req.body;

    // Verificar se o funcionário existe
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      res.status(404).json({ error: "Funcionário não encontrado" });
    }

    // Validar localização
    const isInLocation = validateLocation(latitude, longitude);
    if (!isInLocation) {
      res.status(403).json({
        error: "Você precisa estar na empresa para registrar o ponto",
      });
    }

    // Criar registro de entrada
    const timeRecord = new TimeRecord({
      employeeId,
      clockIn: new Date(),
      location: { latitude, longitude },
    });

    await timeRecord.save();
    res.status(201).json(timeRecord);
  } catch (error) {
    console.error("Erro no clock-in:", error);
    res.status(400).json({ error: "Erro ao registrar entrada" });
  }
};

export const startLunch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { recordId } = req.body;

    const timeRecord = await TimeRecord.findById(recordId);
    if (!timeRecord) {
      res.status(404).json({ error: "Registro de ponto não encontrado" });
      return;
    }

    timeRecord.lunchStart = new Date();
    await timeRecord.save();
    res.status(200).json(timeRecord);
  } catch (error) {
    console.error("Erro ao registrar saída para almoço:", error);
    res.status(404).json({ error: "Erro ao registra saída pra almoço" });
  }
};

export const endLunch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recordId } = req.body;

    const timeRecord = await TimeRecord.findById(recordId);
    if (!timeRecord) {
      res.status(404).json({ error: "Registro de ponto não encontrado" });
      return;
    }

    timeRecord.lunchEnd = new Date();
    await timeRecord.save();
    res.status(200).json(timeRecord);
  } catch (error) {
    console.error("Erro ao registrar saída para almoço:", error);
    res.status(404).json({ error: "Erro ao registra saída pra almoço" });
  }
};

// Registrar saída (clock-out)
export const clockOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recordId } = req.body;

    // Encontrar registro de ponto
    const timeRecord = await TimeRecord.findById(recordId);
    if (!timeRecord) {
      res.status(404).json({ error: "Registro de ponto não encontrado" });
      return;
    }

    // Atualizar horário de saída
    timeRecord.clockOut = new Date();
    await timeRecord.save();

    res.status(200).json(timeRecord);
  } catch (error) {
    console.error("Erro no clock-out:", error);
    res.status(400).json({ error: "Erro ao registrar saída" });
  }
};

// Validação de localização
const validateLocation = (latitude: number, longitude: number): boolean => {
  const companyLatitude = -18.91260879304069;
  const companyLongitude = -48.18867069723629;
  const maxDistance = 0.002; // ~222 metros

  const isLatitudeInRange = Math.abs(latitude - companyLatitude) <= maxDistance;
  const isLongitudeInRange =
    Math.abs(longitude - companyLongitude) <= maxDistance;

  return isLatitudeInRange && isLongitudeInRange;
};
