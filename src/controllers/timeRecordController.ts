import { Request, Response } from "express";
import { TimeRecord } from "../models/TimeRecord";
import { Employee } from "../models/Employee";
import { error } from "console";

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
