import { Request, Response } from 'express';
import { getAggregatedTimeRecords } from '../utils/timeRecordAggregation';
import { TimeRecord } from '../models/TimeRecord';
import { Employee } from '../models/Employee';
import { z } from 'zod';
import { Company } from '../models/Company';

// Schemas de validação

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

export const getTimeRecords = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, period, employeeId } = req.query;

    const user = (req as Request & { user?: CustomUser }).user;

    if (!user) {
      res.status(401).json({ error: 'Usuário não autenticado.' });
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
        res
          .status(403)
          .json({
            error: 'Permissão negada. Funcionário não pertence à sua empresa.',
          });
        return;
      }

      employeeIdConsultado = String(employeeId);
    } else if (user.role === 'employee') {
      // Funcionário só pode consultar seus próprios dados
      employeeIdConsultado = user.id;
    } else {
      res.status(403).json({ error: 'Permissão negada.' });
      return;
    }

    const records = await getAggregatedTimeRecords(
      employeeIdConsultado,
      String(startDate),
      String(endDate),
      period as 'day' | 'week' | 'month' | 'year'
    );

    if (!records.results || records.results.length === 0) {
      res.status(404).json({ message: 'Nenhum registro encontrado.' });
      return;
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
    const company = await Company.findById(employee.companyId);
    if (!company) {
      res.status(404).json({ error: 'Empresa vinculada não encontrada.' });
      return;
    }

    const isInLocation = validateLocation(
      latitude,
      longitude,
      company.latitude,
      company.longitude
    );

    if (!isInLocation) {
      res.status(403).json({
        error:
          'Você parece estar fora da empresa. Verifique se está dentro do local e, se necessário, ative e desative a localização do seu dispositivo antes de tentar novamente.',
      });
      return;
    }

    const now = new Date();
    const localDate = new Date(now.getTime() - 3 * 60 * 60 * 1000); // Ajusta para horário do Brasil
    const today = localDate.toISOString().split('T')[0];

    // Verifica se já existe um registro para o "dia local"
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
    const isInLocation = validateLocation(
      latitude,
      longitude,
      company.latitude,
      company.longitude
    );

    if (!isInLocation) {
      res.status(403).json({
        error:
          'Você parece estar fora da empresa. Verifique se está dentro do local e, se necessário, ative e desative a localização do seu dispositivo antes de tentar novamente.',
      });
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
