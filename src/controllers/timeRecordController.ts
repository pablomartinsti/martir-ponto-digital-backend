import { Request, Response } from 'express';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';
import { Company } from '../models/Company';
import { Employee } from '../models/Employee';
import { TimeRecord } from '../models/TimeRecord';
import { WorkSchedule } from '../models/WorkSchedule';
import { AuthenticatedRequest } from '../types/auth';
import { getAggregatedTimeRecords } from '../utils/timeRecordAggregation';

dayjs.extend(utc);
dayjs.extend(timezone);

const clockInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const updateTimeRecordSchema = z.object({
  recordId: z.string().nonempty('O ID do registro de ponto e obrigatorio.'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

interface CustomUser {
  id: string;
  role: 'admin' | 'sub_admin' | 'employee';
  companyId?: string;
}

interface LocationValidationResult {
  isValid: boolean;
  distance: number;
}

export const getTimeRecords = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, period, employeeId } = req.query;
    const user = (req as Request & { user?: CustomUser }).user;

    if (!user) {
      res.status(401).json({ error: 'Usuario nao autenticado.' });
      return;
    }

    if (!startDate || !endDate || !period) {
      res.status(400).json({ error: 'Parametros obrigatorios ausentes.' });
      return;
    }

    if (!['day', 'week', 'month'].includes(period as string)) {
      res
        .status(400)
        .json({ error: 'Periodo invalido. Use day, week ou month.' });
      return;
    }

    let employeeIdConsultado: string;
    let employee;

    if (user.role === 'admin') {
      if (!employeeId) {
        res.status(400).json({ error: 'employeeId e obrigatorio para admin.' });
        return;
      }
      employeeIdConsultado = String(employeeId);
      employee = await Employee.findById(employeeId);
      if (!employee) {
        res.status(404).json({ error: 'Funcionario nao encontrado.' });
        return;
      }
    } else if (user.role === 'sub_admin') {
      if (!employeeId) {
        res
          .status(400)
          .json({ error: 'employeeId e obrigatorio para sub_admin.' });
        return;
      }

      employee = await Employee.findById(employeeId);
      if (!employee || String(employee.companyId) !== user.companyId) {
        res.status(403).json({
          error: 'Permissao negada. Funcionario nao pertence a sua empresa.',
        });
        return;
      }

      employeeIdConsultado = String(employeeId);
    } else if (user.role === 'employee') {
      employeeIdConsultado = user.id;
      employee = await Employee.findById(user.id);
      if (!employee) {
        res.status(404).json({ error: 'Funcionario nao encontrado.' });
        return;
      }
    } else {
      res.status(403).json({ error: 'Permissao negada.' });
      return;
    }

    const inputStart = dayjs(String(startDate)).startOf('day');
    const inputEnd = dayjs(String(endDate)).endOf('day');
    const createdAt = dayjs(employee.createdAt).startOf('day');

    const adjustedStart = inputStart.isBefore(createdAt)
      ? createdAt
      : inputStart;

    const records = await getAggregatedTimeRecords(
      employeeIdConsultado,
      adjustedStart.format('YYYY-MM-DD'),
      inputEnd.format('YYYY-MM-DD'),
      period as 'day' | 'week' | 'month'
    );

    if (!records.records || records.records.length === 0) {
      res.status(200).json({
        ...records,
        records: [],
        message:
          records.message || records.error || 'Nenhum registro encontrado.',
      });
      return;
    }

    res.status(200).json(records);
  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro interno ao buscar registros.' });
  }
};

export const clockIn = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Usuario nao autenticado.' });
      return;
    }

    const { latitude, longitude } = clockInSchema.parse(req.body);
    const employeeId = user.id;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      res.status(404).json({ error: 'Funcionario nao encontrado.' });
      return;
    }

    if (!employee.isActive) {
      res.status(403).json({ error: 'Funcionario desativado.' });
      return;
    }

    const company = await Company.findById(employee.companyId);
    if (!company) {
      res.status(404).json({ error: 'Empresa vinculada nao encontrada.' });
      return;
    }

    const now = dayjs().tz('America/Sao_Paulo');
    const today = now.format('YYYY-MM-DD');

    const { isValid, distance } = validateLocation(
      latitude,
      longitude,
      company.latitude,
      company.longitude
    );

    if (!isValid) {
      res.status(403).json({
        error: `Voce esta a ${distance} metros da empresa. Aproxime-se para bater o ponto.`,
      });
      return;
    }

    const schedule = await WorkSchedule.findOne({ employeeId });
    const dayOfWeek = now.format('dddd').toLowerCase();
    const todaySchedule = schedule?.customDays.find(
      (day) => day.day.toLowerCase() === dayOfWeek
    );

    if (!todaySchedule || todaySchedule.isDayOff) {
      res.status(403).json({ error: 'Hoje e folga ou nao possui escala.' });
      return;
    }

    const [hour, minute] = todaySchedule.start.split(':').map(Number);
    const startAllowed = now
      .clone()
      .set('hour', hour)
      .set('minute', minute)
      .set('second', 0)
      .set('millisecond', 0);
    const cincoMinAntes = startAllowed.subtract(5, 'minute');

    if (now.isBefore(cincoMinAntes)) {
      res.status(403).json({
        error:
          'Voce ainda nao pode iniciar a jornada. E permitido bater ponto ate 5 minutos antes do horario da escala.',
      });
      return;
    }

    const existingRecord = await TimeRecord.findOne({
      employeeId,
      date: today,
    });

    if (existingRecord?.clockIn) {
      res.status(400).json({ error: 'Jornada ja iniciada hoje.' });
      return;
    }

    const timeRecord = await TimeRecord.findOneAndUpdate(
      { employeeId, date: today },
      {
        $set: {
          clockIn: now.toDate(),
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

const updateTimeRecordField = async (
  req: AuthenticatedRequest,
  res: Response,
  field: 'lunchStart' | 'lunchEnd' | 'clockOut'
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Usuario nao autenticado.' });
      return;
    }

    const { recordId, latitude, longitude } = updateTimeRecordSchema.parse(
      req.body
    );

    const timeRecord = await TimeRecord.findById(recordId);
    if (!timeRecord) {
      res.status(404).json({ error: 'Registro de ponto nao encontrado.' });
      return;
    }

    if (String(timeRecord.employeeId) !== user.id) {
      res.status(403).json({
        error: 'Permissao negada para alterar registro de outro funcionario.',
      });
      return;
    }

    const employee = await Employee.findById(timeRecord.employeeId);
    if (!employee) {
      res.status(404).json({ error: 'Funcionario nao encontrado.' });
      return;
    }

    if (!employee.isActive) {
      res.status(403).json({ error: 'Funcionario desativado.' });
      return;
    }

    const company = await Company.findById(employee.companyId);
    if (!company) {
      res.status(404).json({ error: 'Empresa nao encontrada.' });
      return;
    }

    const { isValid, distance } = validateLocation(
      latitude,
      longitude,
      company.latitude,
      company.longitude
    );

    if (!isValid) {
      res.status(403).json({
        error: `Voce esta a ${distance} metros da empresa. Aproxime-se para registrar o ponto.`,
      });
      return;
    }

    if (field === 'lunchStart' && timeRecord.lunchStart) {
      res.status(400).json({ error: 'Saida para almoco ja registrada hoje.' });
      return;
    }

    if (field === 'lunchEnd') {
      if (!timeRecord.lunchStart) {
        res
          .status(400)
          .json({ error: 'Saida para almoco ainda nao registrada.' });
        return;
      }
      if (timeRecord.lunchEnd) {
        res
          .status(400)
          .json({ error: 'Retorno do almoco ja registrado hoje.' });
        return;
      }

      const schedule = await WorkSchedule.findOne({
        employeeId: timeRecord.employeeId,
      });

      const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
        .format(new Date(`${timeRecord.date}T00:00:00`))
        .toLowerCase();

      const todaySchedule = schedule?.customDays.find(
        (day) => day.day.toLowerCase() === dayOfWeek
      );
      const expectedBreakMinutes =
        todaySchedule?.expectedLunchBreakMinutes || 60;

      const diffInMs =
        dayjs().tz('America/Sao_Paulo').toDate().getTime() -
        new Date(timeRecord.lunchStart).getTime();
      const diffInMinutes = diffInMs / 60000;

      if (diffInMinutes < expectedBreakMinutes) {
        res.status(403).json({
          error: `Tempo minimo de intervalo para almoco: ${expectedBreakMinutes} minutos.`,
        });
        return;
      }
    }

    if (field === 'clockOut' && timeRecord.clockOut) {
      res.status(400).json({ error: 'Jornada ja finalizada hoje.' });
      return;
    }

    timeRecord[field] = dayjs().tz('America/Sao_Paulo').toDate();
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

export const startLunch = (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => updateTimeRecordField(req, res, 'lunchStart');

export const endLunch = (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => updateTimeRecordField(req, res, 'lunchEnd');

export const clockOut = (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => updateTimeRecordField(req, res, 'clockOut');

export const getTodayTimeRecord = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Usuario nao autenticado.' });
      return;
    }

    const today = dayjs().tz('America/Sao_Paulo').format('YYYY-MM-DD');

    const record = await TimeRecord.findOne({
      employeeId: user.id,
      date: today,
    });

    res.status(200).json({ record: record || null });
  } catch (error) {
    console.error('Erro ao buscar registro do dia:', error);
    res.status(500).json({ error: 'Erro ao buscar registro do dia.' });
  }
};

const validateLocation = (
  userLat: number,
  userLng: number,
  companyLat: number,
  companyLng: number
): LocationValidationResult => {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const earthRadius = 6371e3;
  const dLat = toRad(companyLat - userLat);
  const dLng = toRad(companyLng - userLng);
  const lat1 = toRad(userLat);
  const lat2 = toRad(companyLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;

  return {
    isValid: distance <= 50,
    distance: Math.round(distance),
  };
};
