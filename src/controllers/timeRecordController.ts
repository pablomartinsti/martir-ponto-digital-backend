import { Request, Response } from 'express';
import { getAggregatedTimeRecords } from '../utils/timeRecordAggregation';
import { TimeRecord } from '../models/TimeRecord';
import { Employee } from '../models/Employee';
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

export const getTimeRecords = async (req: any, res: any) => {
  try {
    const { startDate, endDate, period, employeeId } = req.query;

    const requisitadoPor = (req as any).user.id;
    const tipo = (req as any).user.role;

    const employeeIdConsultado =
      tipo === 'admin' && employeeId ? employeeId : requisitadoPor;

    const records = await getAggregatedTimeRecords(
      employeeIdConsultado,
      startDate as string,
      endDate as string,
      period as 'day' | 'week' | 'month' | 'year'
    );

    if (!records.results || records.results.length === 0) {
      return res.status(404).json({ message: 'Nenhum registro encontrado.' });
    }

    res.status(200).json(records);
  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro interno ao buscar registros.' });
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
