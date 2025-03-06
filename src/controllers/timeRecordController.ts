import { Request, Response } from 'express';
import moment from 'moment-timezone';
import { TimeRecord } from '../models/TimeRecord';
import { Employee } from '../models/Employee';
import { WorkSchedule } from '../models/WorkSchedule';
import { getDateFilter } from '../utils/dateFilter';
import {
  calculateTotalHours,
  calculateWorkHours,
} from '../utils/workHoursCalculator';
import { z } from 'zod';

// Schemas de validação
const recordIdSchema = z.object({
  recordId: z.string().nonempty('O ID do registro é obrigatório.'),
});

const clockInSchema = z.object({
  employeeId: z.string().nonempty('O ID do funcionário é obrigatório.'),
  latitude: z.number(),
  longitude: z.number(),
});

export const getTimeRecords = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, period } = req.query;

    const dateFilter: { [key: string]: any } = getDateFilter(
      startDate as string,
      endDate as string,
      period as string
    );

    // Restringir registros para funcionários
    if ((req as any).user?.role === 'employee') {
      dateFilter['employeeId'] = (req as any).user.id;
    }

    const records = await TimeRecord.find(dateFilter);

    if (!records.length) {
      res.status(404).json({
        message: 'Nenhum registro encontrado no intervalo especificado.',
      });
      return; // ENCERRA a execução
    }

    const results = await Promise.all(
      records.map(async (record) => {
        const schedule = await WorkSchedule.findOne({
          employeeId: record.employeeId,
        });

        const workSchedule =
          schedule?.customDays.reduce(
            (acc, day) => {
              acc[day.day.toLowerCase()] = day.dailyHours;
              return acc;
            },
            {} as { [key: string]: number }
          ) || {};

        const calculation = calculateWorkHours(record, workSchedule);

        return {
          ...record.toObject(),
          clockIn: moment.tz(record.clockIn, 'America/Sao_Paulo').format(),
          lunchStart: record.lunchStart
            ? moment.tz(record.lunchStart, 'America/Sao_Paulo').format()
            : null,
          lunchEnd: record.lunchEnd
            ? moment.tz(record.lunchEnd, 'America/Sao_Paulo').format()
            : null,
          clockOut: record.clockOut
            ? moment.tz(record.clockOut, 'America/Sao_Paulo').format()
            : null,
          ...calculation,
        };
      })
    );

    const workSchedule = await WorkSchedule.findOne({
      employeeId: records[0]?.employeeId,
    });

    if (!workSchedule || !workSchedule.customDays.length) {
      res.status(404).json({ error: 'Escala de trabalho não encontrada.' });
      return; // ENCERRA a execução
    }

    const schedule =
      workSchedule?.customDays.reduce(
        (acc, day) => {
          acc[day.day.toLowerCase()] = day.dailyHours;
          return acc;
        },
        {} as { [key: string]: number }
      ) || {};

    // Calcular o saldo mensal usando a nova função calculateTotalHours
    const monthlyResult = calculateTotalHours(records, schedule);

    console.log('Records:', records);
    console.log('Schedule:', schedule);
    console.log('Monthly Result:', monthlyResult);

    // Retornar os resultados diários e o saldo mensal
    res.status(200).json({
      dailyResults: results, // Resultados diários
      monthlyResult, // Resumo mensal
    });
    return; // ENCERRA a execução
  } catch (error) {
    console.error('Erro ao buscar registros de tempo:', error);
    res.status(500).json({ error: 'Erro ao buscar registros de tempo.' });
    return; // ENCERRA a execução
  }
};

export const clockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, latitude, longitude } = clockInSchema.parse(req.body);

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      res.status(404).json({ error: 'Funcionário não encontrado' });
      return;
    }

    const isInLocation = validateLocation(latitude, longitude);
    if (!isInLocation) {
      res.status(403).json({
        error: 'Você precisa estar na empresa para registrar o ponto.',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Verifica se já existe um registro para hoje com `clockIn`
    const existingRecord = await TimeRecord.findOne({
      employeeId,
      date: today,
    });
    if (existingRecord?.clockIn) {
      res.status(400).json({ error: 'Jornada já iniciada hoje.' });
      return;
    }

    // Caso não exista um registro com `clockIn`, cria ou atualiza o registro
    const timeRecord = await TimeRecord.findOneAndUpdate(
      { employeeId, date: today }, // Busca pelo ID do funcionário e a data
      {
        $set: {
          clockIn: new Date(),
          location: { latitude, longitude },
          date: today,
        },
      }, // Atualiza ou cria
      { new: true, upsert: true } // Retorna o registro atualizado ou cria um novo
    );

    res.status(201).json(timeRecord);
    return;
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
  req: Request,
  res: Response,
  field: 'lunchStart' | 'lunchEnd' | 'clockOut'
): Promise<void> => {
  try {
    const { recordId } = recordIdSchema.parse(req.body);

    const timeRecord = await TimeRecord.findById(recordId);
    if (!timeRecord) {
      res.status(404).json({ error: 'Registro de ponto não encontrado.' });
      return;
    }

    // Verificar se a ação já foi realizada
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
    }

    if (field === 'clockOut' && timeRecord.clockOut) {
      res.status(400).json({ error: 'Jornada já finalizada hoje.' });
      return;
    }

    // Atualiza o campo correspondente
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

export const startLunch = (req: Request, res: Response): Promise<void> =>
  updateTimeRecordField(req, res, 'lunchStart');

export const endLunch = (req: Request, res: Response): Promise<void> =>
  updateTimeRecordField(req, res, 'lunchEnd');

export const clockOut = (req: Request, res: Response): Promise<void> =>
  updateTimeRecordField(req, res, 'clockOut');

// Validação de localização
const validateLocation = (latitude: number, longitude: number): boolean => {
  const companyLatitude = -18.91260879304069;
  const companyLongitude = -48.18867069723629;
  const maxDistance = 0.002; // ~222 metros

  return (
    Math.abs(latitude - companyLatitude) <= maxDistance &&
    Math.abs(longitude - companyLongitude) <= maxDistance
  );
};
