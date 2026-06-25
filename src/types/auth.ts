import { Request } from 'express';

export type UserRole = 'admin' | 'sub_admin' | 'employee';

export interface AuthUser {
  id: string;
  name?: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
