// Controller responsável pelo registro de ponto (entrada, almoço e saída), validações de localização,
// e consulta de registros agregados (por dia, semana ou mês).
import { Request, Response } from 'express';
import { getAggregatedTimeRecords } from '../utils/timeRecordAggregation';
import { TimeRecord } from '../models/TimeRecord';
import { Employee } from '../models/Employee';
import { WorkSchedule } from '../models/WorkSchedule';
import { z } from 'zod';
import { Company } from '../models/Company';

// Validação do schema de entrada do ponto
const clockInSchema = z.object({
  employeeId: z.string().nonempty('O ID do funcionário é obrigatório.'),
  latitude: z.number(),
  longitude: z.number(),
});

interface CustomUser {
  id: string;
  role: 'admin' | 'sub_admin' | 'employee';
  companyId?: string;
}

// Consulta registros de ponto agrupados por período
export const getTimeRecords = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, period, employeeId } = req.query;
    const user = (req as Request & { user?: CustomUser }).user;

    if (!user) {
      res.status(401).json({ error: 'Usuário não autenticado.' });
      return;
    }

    if (!startDate || !endDate || !period) {
      res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
      return;
    }

    if (!['day', 'week', 'month'].includes(period as string)) {
      res
        .status(400)
        .json({ error: 'Período inválido. Use day, week ou month.' });
      return;
    }

    let employeeIdConsultado: string;

    if (user.role === 'admin') {
      if (!employeeId) {
        res.status(400).json({ error: 'employeeId é obrigatório para admin.' });
        return;
      }
      employeeIdConsultado = String(employeeId);
    } else if (user.role === 'sub_admin') {
      if (!employeeId) {
        res
          .status(400)
          .json({ error: 'employeeId é obrigatório para sub_admin.' });
        return;
      }

      const employee = await Employee.findById(employeeId);
      if (!employee || String(employee.companyId) !== user.companyId) {
        res.status(403).json({
          error: 'Permissão negada. Funcionário não pertence à sua empresa.',
        });
        return;
      }

      employeeIdConsultado = String(employeeId);
    } else if (user.role === 'employee') {
      employeeIdConsultado = user.id;
    } else {
      res.status(403).json({ error: 'Permissão negada.' });
      return;
    }

    const records = await getAggregatedTimeRecords(
      employeeIdConsultado,
      String(startDate),
      String(endDate),
      period as 'day' | 'week' | 'month'
    );

    if (!records.records || records.records.length === 0) {
      res.status(404).json({ message: 'Nenhum registro encontrado.' });
      return;
    }

    res.status(200).json(records);
  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro interno ao buscar registros.' });
  }
};

// Registro de entrada (clock-in)
export const clockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, latitude, longitude } = clockInSchema.parse(req.body);

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      res.status(404).json({ error: 'Funcionário não encontrado' });
      return;
    }
    const company = await Company.findById(employee.companyId);
    if (!company) {
      res.status(404).json({ error: 'Empresa vinculada não encontrada.' });
      return;
    }

    const now = new Date();
    const localDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const today = localDate.toISOString().split('T')[0];

    const isInLocation = validateLocation(
      latitude,
      longitude,
      company.latitude,
      company.longitude
    );

    if (!isInLocation) {
      res.status(403).json({ error: 'Você parece estar fora da empresa.' });
      return;
    }

    const schedule = await WorkSchedule.findOne({ employeeId });
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
      .format(localDate)
      .toLowerCase();
    const todaySchedule = schedule?.customDays.find(
      (d) => d.day.toLowerCase() === dayOfWeek
    );

    if (!todaySchedule || todaySchedule.isDayOff) {
      res.status(403).json({ error: 'Hoje é folga ou não possui escala.' });
      return;
    }

    const [hour, minute] = todaySchedule.start.split(':').map(Number);
    const startAllowed = new Date(localDate);
    startAllowed.setHours(hour, minute, 0, 0);

    if (localDate < startAllowed) {
      res.status(403).json({
        error: 'Não é permitido bater ponto antes do início da jornada.',
      });
      return;
    }

    const existingRecord = await TimeRecord.findOne({
      employeeId,
      date: today,
    });
    if (existingRecord?.clockIn) {
      res.status(400).json({ error: 'Jornada já iniciada hoje.' });
      return;
    }

    const timeRecord = await TimeRecord.findOneAndUpdate(
      { employeeId, date: today },
      {
        $set: {
          clockIn: new Date(),
          location: { latitude, longitude },
          date: today,
        },
      },
      { new: true, upsert: true }
    );

    res.status(201).json(timeRecord);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro no clock-in:', error);
      res.status(500).json({ error: 'Erro ao registrar entrada.' });
    }
  }
};

// Atualiza um campo específico do registro de ponto (almoço ou saída)
const updateTimeRecordField = async (
  req: Request,
  res: Response,
  field: 'lunchStart' | 'lunchEnd' | 'clockOut'
): Promise<void> => {
  try {
    const { recordId, latitude, longitude } = req.body;

    const timeRecord = await TimeRecord.findById(recordId);
    if (!timeRecord) {
      res.status(404).json({ error: 'Registro de ponto não encontrado.' });
      return;
    }

    const employee = await Employee.findById(timeRecord.employeeId);
    if (!employee) {
      res.status(404).json({ error: 'Funcionário não encontrado.' });
      return;
    }

    const company = await Company.findById(employee.companyId);
    if (!company) {
      res.status(404).json({ error: 'Empresa não encontrada.' });
      return;
    }

    const isInLocation = validateLocation(
      latitude,
      longitude,
      company.latitude,
      company.longitude
    );

    if (!isInLocation) {
      res.status(403).json({ error: 'Você parece estar fora da empresa.' });
      return;
    }

    if (field === 'lunchStart' && timeRecord.lunchStart) {
      res.status(400).json({ error: 'Saída para almoço já registrada hoje.' });
      return;
    }

    if (field === 'lunchEnd') {
      if (!timeRecord.lunchStart) {
        res
          .status(400)
          .json({ error: 'Saída para almoço ainda não registrada.' });
        return;
      }
      if (timeRecord.lunchEnd) {
        res
          .status(400)
          .json({ error: 'Retorno do almoço já registrado hoje.' });
        return;
      }

      const schedule = await WorkSchedule.findOne({
        employeeId: timeRecord.employeeId,
      });

      const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
        .format(new Date((timeRecord as any).date + 'T00:00:00'))
        .toLowerCase();

      const todaySchedule = schedule?.customDays.find(
        (d) => d.day.toLowerCase() === dayOfWeek
      );
      const expectedBreakMinutes =
        todaySchedule?.expectedLunchBreakMinutes || 60;

      const diffInMs =
        new Date().getTime() - new Date(timeRecord.lunchStart).getTime();
      const diffInMinutes = diffInMs / 60000;

      if (diffInMinutes < expectedBreakMinutes) {
        res.status(403).json({
          error: `Tempo mínimo de intervalo para almoço: ${expectedBreakMinutes} minutos.`,
        });
        return;
      }
    }

    if (field === 'clockOut' && timeRecord.clockOut) {
      res.status(400).json({ error: 'Jornada já finalizada hoje.' });
      return;
    }

    timeRecord[field] = new Date();
    await timeRecord.save();

    res.status(200).json(timeRecord);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error(`Erro ao atualizar ${field}:`, error);
      res.status(500).json({ error: `Erro ao registrar ${field}.` });
    }
  }
};

// Funções específicas de atualização
export const startLunch = (req: Request, res: Response): Promise<void> =>
  updateTimeRecordField(req, res, 'lunchStart');

export const endLunch = (req: Request, res: Response): Promise<void> =>
  updateTimeRecordField(req, res, 'lunchEnd');

export const clockOut = (req: Request, res: Response): Promise<void> =>
  updateTimeRecordField(req, res, 'clockOut');

// Validação de proximidade da localização do funcionário com a da empresa
const validateLocation = (
  userLat: number,
  userLng: number,
  companyLat: number,
  companyLng: number
): boolean => {
  const maxDistance = 0.002; // ~222 metros
  return (
    Math.abs(userLat - companyLat) <= maxDistance &&
    Math.abs(userLng - companyLng) <= maxDistance
  );
};
