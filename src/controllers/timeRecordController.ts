import { Request, Response } from "express";
import moment from "moment-timezone";
import { TimeRecord } from "../models/TimeRecord";
import { Employee } from "../models/Employee";
import { getDateFilter } from "../utils/dateFilter";
import { calculateWorkHours } from "../utils/workHoursCalculator";
import { IWorkSchedule, WorkSchedule } from "../models/WorkSchedule";

export const getTimeRecords = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, period } = req.query;

    let dateFilter: { [key: string]: any } = getDateFilter(
      startDate as string,
      endDate as string,
      period as string
    );

    // Restringir registros para funcionários
    if ((req as any).user?.role === "employee") {
      dateFilter["employeeId"] = (req as any).user.id;
    }

    const records = await TimeRecord.find(dateFilter);

    const results = await Promise.all(
      records.map(async (record) => {
        const schedule = (await WorkSchedule.findOne({
          employeeId: record.employeeId,
        })) as IWorkSchedule | null;

        // Ajustar `record.clockIn` para o fuso horário correto antes de calcular o dia
        const localClockIn = moment
          .tz(record.clockIn, "America/Sao_Paulo")
          .format("dddd");

        const dailyHours =
          schedule?.customDays.find((day) => day.day === localClockIn)
            ?.dailyHours ?? 8;

        const calculation = calculateWorkHours(record, dailyHours);

        // Converter horários para o fuso horário correto antes de retornar
        return {
          ...record.toObject(),
          clockIn: moment.tz(record.clockIn, "America/Sao_Paulo").format(),
          lunchStart: record.lunchStart
            ? moment.tz(record.lunchStart, "America/Sao_Paulo").format()
            : null,
          lunchEnd: record.lunchEnd
            ? moment.tz(record.lunchEnd, "America/Sao_Paulo").format()
            : null,
          clockOut: record.clockOut
            ? moment.tz(record.clockOut, "America/Sao_Paulo").format()
            : null,
          ...calculation,
        };
      })
    );

    res.status(200).json(results);
  } catch (error) {
    console.error("Erro ao buscar registros de tempo:", error);
    res.status(500).json({ error: "Erro ao buscar registros de tempo." });
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
