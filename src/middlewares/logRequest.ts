import { Request, Response, NextFunction } from 'express';
import EventLog from '../models/EventLog';

export const logRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on('finish', async () => {
    try {
      // ❌ Ignora requisições bem-sucedidas (apenas erros serão logados)
      if (res.statusCode < 400) return;

      // ❌ Ignora a própria rota de log
      if (req.originalUrl === '/log-event') return;
      const user = (req as any).user;
      const deviceInfo = req.headers['x-device-info']
        ? JSON.parse(req.headers['x-device-info'] as string)
        : null;

      await EventLog.create({
        userId: user?.id || null,
        companyId: user?.companyId || null,
        route: req.originalUrl,
        method: req.method,
        action: `${req.method} ${req.originalUrl}`,
        status: res.statusCode < 400 ? 'success' : 'error',
        message: `Requisição finalizada com status ${res.statusCode}`,
        data: req.body,
        device: deviceInfo,
        timestamp: new Date(),
      });
    } catch (err) {
      if (err instanceof Error) {
        console.error('❌ Erro ao salvar log de requisição:', err.message);
      } else {
        console.error('❌ Erro ao salvar log de requisição:', err);
      }
    }
  });

  next();
};
