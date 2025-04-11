import { Request, Response } from 'express';
import { z } from 'zod';
import { Absence } from '../models/Absence';
import { Employee } from '../models/Employee';
import { WorkSchedule } from '../models/WorkSchedule';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { TimeRecord } from '../models/TimeRecord';

// Configurações do dayjs com fuso horário
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/Sao_Paulo');

// Validação dos dados recebidos para criar ou atualizar ausência
const absenceSchema = z.object({
  employeeId: z.string(),
  date: z.string(),
  type: z.enum([
    'vacation',
    'sick_leave',
    'justified',
    'unjustified',
    'holiday',
    'day_off',
  ]),
});

// Interface do usuário autenticado
interface CustomRequest extends Request {
  user?: {
    id: string;
    role: 'admin' | 'sub_admin' | 'employee';
    companyId?: string;
  };
}

// Criação ou atualização de ausência por sub_admin
export const createOrUpdateAbsence = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user || user.role !== 'sub_admin') {
      res
        .status(403)
        .json({ error: 'Apenas sub_admin pode registrar ausências.' });
      return;
    }

    const data = absenceSchema.parse(req.body);

    const employee = await Employee.findById(data.employeeId);
    if (!employee || String(employee.companyId) !== String(user.companyId)) {
      res
        .status(403)
        .json({ error: 'Funcionário não pertence à sua empresa.' });
      return;
    }

    const schedule = await WorkSchedule.findOne({ employeeId: employee._id });
    if (!schedule) {
      res.status(400).json({
        error: 'Escala de trabalho não encontrada para o funcionário.',
      });
      return;
    }

    const date = dayjs.tz(data.date);
    const today = dayjs().tz();

    // Impede ausência para hoje ou datas futuras
    if (date.isSame(today, 'day') || date.isAfter(today)) {
      res.status(400).json({
        error: 'Só é permitido registrar ausência para datas passadas.',
      });
      return;
    }

    // Impede ausência em dias com jornada completa
    const existingTimeRecord = await TimeRecord.findOne({
      employeeId: data.employeeId,
      date: data.date,
    });
    if (
      existingTimeRecord?.clockIn &&
      existingTimeRecord?.lunchStart &&
      existingTimeRecord?.lunchEnd &&
      existingTimeRecord?.clockOut
    ) {
      res.status(400).json({
        error:
          'Não é possível registrar ausência em um dia com jornada completa.',
      });
      return;
    }

    // Verifica se o dia está configurado como dia útil na escala
    const dayOfWeek = date.format('dddd').toLowerCase();
    const daySchedule = schedule.customDays.find(
      (d) => d.day.toLowerCase() === dayOfWeek
    );

    if (!daySchedule || daySchedule.isDayOff) {
      res.status(400).json({
        error: 'Não é possível registrar ausência em um dia sem expediente.',
      });
      return;
    }

    // Atualiza ausência existente ou cria nova
    const existing = await Absence.findOne({
      employeeId: data.employeeId,
      date: data.date,
    });

    if (existing) {
      existing.type = data.type;
      await existing.save();
      res.status(200).json(existing);
      return;
    }

    const absence = new Absence({
      ...data,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await absence.save();
    res.status(201).json(absence);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar ausência.' });
  }
};

// Listagem de ausências de um funcionário (visível para sub_admin)
export const listAbsencesByEmployee = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { employeeId } = req.params;

    if (!user || user.role !== 'sub_admin') {
      res
        .status(403)
        .json({ error: 'Apenas sub_admin pode acessar ausências.' });
      return;
    }

    const employee = await Employee.findById(employeeId);
    if (!employee || String(employee.companyId) !== String(user.companyId)) {
      res
        .status(403)
        .json({ error: 'Funcionário não pertence à sua empresa.' });
      return;
    }

    const absences = await Absence.find({ employeeId });
    res.json(absences);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ausências.' });
  }
};
