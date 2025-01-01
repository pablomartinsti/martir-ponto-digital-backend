import { Request, Response } from "express";
import { WorkSchedule } from "../models/WorkSchedule";

export const setWorkSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { employeeId, dailyHours, weeklyDays, customDays } = req.body;

    // Verificar se a escala já existe
    const existingSchedule = await WorkSchedule.findOne({ employeeId });

    if (existingSchedule) {
      // Atualizar escala existente
      existingSchedule.dailyHours = dailyHours;
      existingSchedule.weeklyDays = weeklyDays;
      existingSchedule.customDays = customDays || [];
      await existingSchedule.save();
      res.status(200).json({
        message: "Escala atualizada com sucesso",
        schedule: existingSchedule,
      });
    } else {
      // Criar nova escala
      const newSchedule = new WorkSchedule({
        employeeId,
        dailyHours,
        weeklyDays,
        customDays,
      });
      await newSchedule.save();
      res
        .status(201)
        .json({ message: "Escala criada com sucesso", schedule: newSchedule });
    }
  } catch (error) {
    console.error("Erro ao configurar escala:", error);
    res.status(500).json({ error: "Erro ao configurar escala de trabalho" });
  }
};

export const getWorkSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { employeeId } = req.params;

    const schedule = await WorkSchedule.findOne({ employeeId });

    if (!schedule) {
      res
        .status(404)
        .json({ error: "Escala não encontrada para este funcionário" });
      return;
    }

    res.status(200).json(schedule);
  } catch (error) {
    console.error("Erro ao buscar escala:", error);
    res.status(500).json({ error: "Erro ao buscar escala de trabalho" });
  }
};
export const listWorkSchedules = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const schedules = await WorkSchedule.find().populate(
      "employeeId",
      "name position"
    );
    res.status(200).json(schedules);
  } catch (error) {
    console.error("Erro ao listar escalas:", error);
    res.status(500).json({ error: "Erro ao listar escalas de trabalho" });
  }
};
