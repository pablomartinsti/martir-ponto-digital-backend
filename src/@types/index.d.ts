// src/@types/express/index.d.ts

import { Request } from 'express';
console.log('Tipagem global carregada!');

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'admin' | 'sub_admin' | 'employee';
        companyId?: string;
      };
    }
  }
}
