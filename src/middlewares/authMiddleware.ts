import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedRequest, AuthUser, UserRole } from '../types/auth';

const isAuthUser = (payload: unknown): payload is AuthUser => {
  if (!payload || typeof payload !== 'object') return false;

  const decoded = payload as Partial<AuthUser>;
  return (
    typeof decoded.id === 'string' &&
    ['admin', 'sub_admin', 'employee'].includes(decoded.role ?? '')
  );
};

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authorization = req.header('Authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;

  if (!token) {
    res.status(401).json({ error: 'Acesso nao autorizado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (!isAuthUser(decoded)) {
      res.status(401).json({ error: 'Token invalido' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalido' });
  }
};

export const authorize = (roles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuario nao autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Permissao negada' });
      return;
    }

    next();
  };
};
