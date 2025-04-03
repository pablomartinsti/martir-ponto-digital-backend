import { Request, Response } from 'express';
import { WorkSchedule } from '../models/WorkSchedule';
import { z } from 'zod';
import { Employee } from '../models/Employee';

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

// Buscar escala de um funcionário
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

    // Verifica se o sub_admin está tentando acessar funcionário de outra empresa
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

// Listar escalas de todos os funcionários
export const listWorkSchedules = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const requester = req.user!;

    let query = {};
    if (requester.role === 'sub_admin') {
      // Busca apenas os funcionários da empresa do sub_admin
      const employees = await Employee.find({ companyId: requester.companyId });
      const employeeIds = employees.map((emp) => emp._id);
      query = { employeeId: { $in: employeeIds } };
    }

    const schedules = await WorkSchedule.find(query).populate(
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
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const requester = req.user!;

    // Verifica se o usuário é um admin
    if (requester.role !== 'admin') {
      res.status(403).json({
        error: 'Você não tem permissão para excluir escalas.',
      });
      return;
    }

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
