import { filterEmployeesSchema } from '../../dtos/employee/employeeSchemas';
import { Company } from '../../models/Company';
import { Employee } from '../../models/Employee';
import { AuthUser } from '../../types/auth';
import { AppError } from '../../errors/AppError';
import { ensureAuthenticated } from './employeeHelpers';

interface GetEmployeesServiceParams {
  user?: AuthUser;
  queryParams: unknown;
}

export const getEmployeesService = async ({
  user,
  queryParams,
}: GetEmployeesServiceParams) => {
  const requester = ensureAuthenticated(user);
  const { filter, cnpj } = filterEmployeesSchema.parse(queryParams);
  const query: Record<string, unknown> = {};

  if (filter === 'active') {
    query.isActive = true;
  } else if (filter === 'inactive') {
    query.isActive = false;
  }

  if (requester.role === 'sub_admin') {
    query.companyId = requester.companyId;
  }

  if (requester.role === 'admin' && cnpj) {
    const company = await Company.findOne({ cnpj });

    if (!company) {
      throw new AppError('Empresa nao encontrada com este CNPJ.', 404);
    }

    query.companyId = company._id;
  }

  return Employee.find(query).populate('companyId', 'name cnpj');
};
