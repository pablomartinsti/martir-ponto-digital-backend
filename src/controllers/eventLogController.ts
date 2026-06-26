import { Request, Response } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { z } from 'zod';
import EventLog from '../models/EventLog';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sanitizeLogData } from '../utils/security';

dayjs.extend(utc);
dayjs.extend(timezone);

const createEventLogSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  route: z.string().optional(),
  method: z.string().optional(),
  action: z.string().optional(),
  status: z.string().optional(),
  message: z.string().optional(),
  data: z.unknown().optional(),
  device: z.unknown().optional(),
});

const listEventLogsSchema = z.object({
  userId: z.string().optional(),
  companyId: z.string().optional(),
  route: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const deleteEventLogsSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  companyId: z.string().optional(),
});

export const createEventLog = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = createEventLogSchema.parse(req.body);

    await EventLog.create({
      ...payload,
      data: sanitizeLogData(payload.data),
    });

    res.status(201).json({ message: 'Log registrado com sucesso.' });
  }
);

export const getEventLogs = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, companyId, route, status, limit, startDate, endDate } =
      listEventLogsSchema.parse(req.query);

    const query: Record<string, unknown> = {};
    if (userId) query.userId = userId;
    if (companyId) query.companyId = companyId;
    if (route) query.route = route;
    if (status) query.status = status;

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

    const logs = await EventLog.find(query).sort({ createdAt: -1 }).limit(limit);
    res.status(200).json(logs);
  }
);

export const deleteEventLogsByMonth = asyncHandler(
  async (req: Request, res: Response) => {
    const { month, year, companyId } = deleteEventLogsSchema.parse(req.query);
    const paddedMonth = String(month).padStart(2, '0');
    const startOfMonth = dayjs
      .tz(`${year}-${paddedMonth}-01T00:00:00`, 'America/Sao_Paulo')
      .utc()
      .toDate();
    const endOfMonth = dayjs(startOfMonth)
      .endOf('month')
      .tz('America/Sao_Paulo')
      .utc()
      .toDate();

    const query: Record<string, unknown> = {
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    };

    if (companyId) {
      query.companyId = companyId;
    }

    const result = await EventLog.deleteMany(query);

    res.status(200).json({
      message: `${result.deletedCount} logs excluidos com sucesso.`,
    });
  }
);
