import { IEmployee } from '../../models/Employee';
import { AuthUser } from '../../types/auth';
import { AppError } from '../../errors/AppError';

export const ensureAuthenticated = (user?: AuthUser): AuthUser => {
  if (!user) {
    throw new AppError('Usuario nao autenticado.', 401);
  }

  return user;
};

export const serializeEmployee = (employee: unknown) => {
  const source =
    employee && typeof (employee as { toObject?: unknown }).toObject === 'function'
      ? (employee as { toObject: () => Record<string, unknown> }).toObject()
      : (employee as Record<string, unknown>);

  const { password, ...safeEmployee } = source;
  return safeEmployee;
};

export const ensureSubAdminCanManageEmployee = (
  requester: AuthUser,
  employee: IEmployee,
  message = 'Permissao negada.'
): void => {
  if (requester.role !== 'sub_admin') return;

  const isSameCompany = String(employee.companyId) === requester.companyId;

  if (!isSameCompany || employee.role !== 'employee') {
    throw new AppError(message, 403);
  }
};
