import { Request, Response } from 'express';
import { WorkSchedule } from '../models/WorkSchedule';
import { z } from 'zod';

// Schema de validação para customDays
const customDaySchema = z.object({
  day: z.enum([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]),
  dailyHours: z.number().min(0).max(24),
});

const workScheduleSchema = z.object({
  employeeId: z.string().nonempty('O ID do funcionário é obrigatório.'),
  customDays: z.array(customDaySchema),
});

// Criar ou atualizar escala de trabalho
export const setWorkSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validatedData = workScheduleSchema.parse(req.body);

    const { employeeId, customDays } = validatedData;

    const existingSchedule = await WorkSchedule.findOne({ employeeId });

    if (existingSchedule) {
      existingSchedule.customDays = customDays;
      await existingSchedule.save();
      res.status(200).json({
        message: 'Escala atualizada com sucesso.',
        schedule: existingSchedule,
      });
    } else {
      const newSchedule = new WorkSchedule({
        employeeId,
        customDays,
      });
      await newSchedule.save();
      res.status(201).json({
        message: 'Escala criada com sucesso.',
        schedule: newSchedule,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro ao configurar escala de trabalho:', error);
      res.status(500).json({ error: 'Erro ao configurar escala de trabalho.' });
    }
  }
};

// Buscar escala de um funcionário
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
        .json({ error: 'Escala não encontrada para este funcionário.' });
      return;
    }

    res.status(200).json(schedule);
  } catch (error) {
    console.error('Erro ao buscar escala:', error);
    res.status(500).json({ error: 'Erro ao buscar escala de trabalho.' });
  }
};

// Listar escalas de todos os funcionários
export const listWorkSchedules = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const schedules = await WorkSchedule.find().populate(
      'employeeId',
      'name position'
    );
    res.status(200).json(schedules);
  } catch (error) {
    console.error('Erro ao listar escalas:', error);
    res.status(500).json({ error: 'Erro ao listar escalas de trabalho.' });
  }
};

// Excluir escala de um funcionário
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
        .json({ error: 'Escala não encontrada para este funcionário' });
      return;
    }

    res.status(200).json({ message: 'Escala excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir escala:', error);
    res.status(500).json({ error: 'Erro ao excluir escala de trabalho' });
  }
};
