import { Request, Response } from 'express';
import { WorkSchedule } from '../models/WorkSchedule';
import { z } from 'zod';
import { Employee } from '../models/Employee';

// Schema de validação para customDays
const customDaySchema = z.object({
  day: z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]),
  start: z
    .string()
    .regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (HH:mm)'),
  end: z
    .string()
    .regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (HH:mm)'),
  hasLunch: z.boolean(),
  expectedLunchBreakMinutes: z.number().min(0).max(180),
  isDayOff: z.boolean(),
});

const workScheduleSchema = z.object({
  employeeId: z.string().nonempty('O ID do funcionário é obrigatório.'),
  customDays: z.array(customDaySchema),
});

interface CustomRequest extends Request {
  user?: {
    id: string;
    role: 'admin' | 'sub_admin' | 'employee';
    companyId?: string;
  };
}

// Criar ou atualizar escala de trabalho
export const setWorkSchedule = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { employeeId, customDays } = workScheduleSchema.parse(req.body);

    const requester = req.user as {
      id: string;
      role: 'admin' | 'sub_admin';
      companyId?: string;
    };
    // Verifica se o sub_admin tem permissão para editar a escala
    if (requester.role === 'sub_admin') {
      const employee = await Employee.findById(employeeId);

      if (!employee) {
        res.status(404).json({ error: 'Funcionário não encontrado.' });
        return;
      }

      if (String(employee.companyId) !== String(requester.companyId)) {
        res.status(403).json({
          error: 'Você só pode gerenciar funcionários da sua empresa.',
        });
        return;
      }
    }

    const existingSchedule = await WorkSchedule.findOne({ employeeId });

    if (existingSchedule) {
      existingSchedule.customDays = customDays;
      await existingSchedule.save();
      res.status(200).json({
        message: 'Escala atualizada com sucesso.',
        schedule: existingSchedule,
      });
    } else {
      const newSchedule = new WorkSchedule({ employeeId, customDays });
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

// Retorna a escala de trabalho de um funcionário específico
export const getWorkSchedule = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const requester = req.user!;

    // Busca o funcionário para verificar se ele pertence à empresa do sub_admin
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      res.status(404).json({ error: 'Funcionário não encontrado.' });
      return;
    }

    // Sub_admin só pode acessar escala de funcionários da sua empresa
    if (
      requester.role === 'sub_admin' &&
      String(employee.companyId) !== String(requester.companyId)
    ) {
      res.status(403).json({
        error: 'Acesso negado à escala deste funcionário.',
      });
      return;
    }

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
