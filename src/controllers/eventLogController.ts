import { Request, Response } from 'express';
import EventLog from '../models/EventLog';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const createEventLog = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      userName,
      companyId,
      companyName,
      route,
      method,
      action,
      status,
      message,
      data,
      device,
    } = req.body;

    const log = new EventLog({
      userId,
      userName,
      companyId,
      companyName,
      route,
      method,
      action,
      status,
      message,
      data,
      device,
    });

    await log.save();

    res.status(201).json({ message: 'Log registrado com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    res.status(500).json({ error: 'Erro ao registrar log.' });
  }
};

export const getEventLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      userId,
      companyId,
      route,
      status,
      limit = 50,
      startDate,
      endDate,
    } = req.query;

    const query: any = {};
    if (userId) query.userId = userId;
    if (companyId) query.companyId = companyId;
    if (route) query.route = route;
    if (status) query.status = status;

    // 👇 Filtro por data usando dayjs
    if (startDate && endDate) {
      const start = dayjs
        .tz(`${startDate}T00:00:00`, 'America/Sao_Paulo')
        .utc()
        .toDate();
      const end = dayjs
        .tz(`${endDate}T23:59:59`, 'America/Sao_Paulo')
        .utc()
        .toDate();

      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    const logs = await EventLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs.' });
  }
};

export const deleteEventLogsByMonth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { month, year, companyId } = req.query;

    if (!month || !year) {
      res.status(400).json({ error: 'Mês e ano são obrigatórios.' });
      return;
    }

    const startOfMonth = dayjs
      .tz(`${year}-${month}-01T00:00:00`, 'America/Sao_Paulo')
      .utc()
      .toDate();

    const endOfMonth = dayjs(startOfMonth)
      .endOf('month')
      .tz('America/Sao_Paulo')
      .utc()
      .toDate();

    const query: any = {
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    };

    if (companyId) {
      query.companyId = companyId;
    }

    const result = await EventLog.deleteMany(query);

    res
      .status(200)
      .json({ message: `${result.deletedCount} logs excluídos com sucesso.` });
    return;
  } catch (error: any) {
    console.error('Erro ao deletar logs:', error);
    res
      .status(500)
      .json({ error: 'Erro ao deletar logs.', details: error.message });
    return;
  }
};
