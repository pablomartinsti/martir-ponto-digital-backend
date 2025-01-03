import { Request, Response } from "express";
import { WorkSchedule } from "../models/WorkSchedule";
import { ICustomDay } from "../models/WorkSchedule";

const validDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const setWorkSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      employeeId,
      customDays,
    }: { employeeId: string; customDays: ICustomDay[] } = req.body;

    // Validação dos dias personalizados
    if (!customDays || !Array.isArray(customDays)) {
      res
        .status(400)
        .json({
          error: "O campo 'customDays' é obrigatório e deve ser uma lista.",
        });
      return;
    }

    for (const day of customDays) {
      if (!validDays.includes(day.day)) {
        res.status(400).json({ error: `Dia inválido: ${day.day}.` });
        return;
      }
      if (day.dailyHours < 0 || day.dailyHours > 24) {
        res
          .status(400)
          .json({
            error: `Horas inválidas para o dia ${day.day}: ${day.dailyHours}.`,
          });
        return;
      }
    }

    // Verificar se a escala já existe para o funcionário
    const existingSchedule = await WorkSchedule.findOne({ employeeId });

    if (existingSchedule) {
      // Atualizar escala existente
      existingSchedule.customDays = customDays;
      await existingSchedule.save();
      res.status(200).json({
        message: "Escala atualizada com sucesso.",
        schedule: existingSchedule,
      });
    } else {
      // Criar nova escala
      const newSchedule = new WorkSchedule({
        employeeId,
        customDays,
      });
      await newSchedule.save();
      res.status(201).json({
        message: "Escala criada com sucesso.",
        schedule: newSchedule,
      });
    }
  } catch (error) {
    console.error("Erro ao configurar escala de trabalho:", error);
    res.status(500).json({ error: "Erro ao configurar escala de trabalho." });
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
        .json({ error: "Escala não encontrada para este funcionário." });
      return;
    }

    res.status(200).json(schedule);
  } catch (error) {
    console.error("Erro ao buscar escala:", error);
    res.status(500).json({ error: "Erro ao buscar escala de trabalho." });
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
    res.status(500).json({ error: "Erro ao listar escalas de trabalho." });
  }
};

export const deleteWorkSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { employeeId } = req.params;

    const deletedSchedule = await WorkSchedule.findOneAndDelete({ employeeId });

    if (!deletedSchedule) {
      res
        .status(404)
        .json({ error: "Escala não encontrada para este funcionário" });
      return;
    }

    res.status(200).json({ message: "Escala excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir escala:", error);
    res.status(500).json({ error: "Erro ao excluir escala de trabalho" });
  }
};
