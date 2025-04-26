import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error('JWT_SECRET não definida no arquivo .env');
}
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'admin' | 'sub_admin' | 'employee';
    companyId?: string;
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Acesso não autorizado' });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      SECRET_KEY
    ) as AuthenticatedRequest['user'];
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!(req as any).user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    if (!roles.includes((req as any).user.role)) {
      res.status(403).json({ error: 'Permissão negada' });
      return;
    }

    next();
  };
};
