import { Response, NextFunction } from 'express';
import EventLog from '../models/EventLog';
import { AuthenticatedRequest } from '../types/auth';
import { sanitizeLogData } from '../utils/security';

const parseDeviceInfo = (value: string | string[] | undefined) => {
  if (!value || Array.isArray(value)) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const logRequest = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  res.on('finish', async () => {
    try {
      if (res.statusCode < 400) return;
      if (req.originalUrl === '/log-event') return;

      await EventLog.create({
        userId: req.user?.id || null,
        userName: req.user?.name || null,
        companyId: req.user?.companyId || null,
        companyName: req.user?.companyName || null,
        route: req.originalUrl,
        method: req.method,
        action: `${req.method} ${req.originalUrl}`,
        status: 'error',
        message: `Requisicao finalizada com status ${res.statusCode}`,
        data: sanitizeLogData(req.body),
        device: parseDeviceInfo(req.headers['x-device-info']),
      });
    } catch (err) {
      if (err instanceof Error) {
        console.error('Erro ao salvar log de requisicao:', err.message);
      } else {
        console.error('Erro ao salvar log de requisicao:', err);
      }
    }
  });

  next();
};
