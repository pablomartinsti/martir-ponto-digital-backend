import { AppError } from '../../errors/AppError';
import { Company } from '../../models/Company';
import { AuthUser } from '../../types/auth';

interface GetAllCompaniesServiceParams {
  user?: AuthUser;
}

export const getAllCompaniesService = async ({
  user,
}: GetAllCompaniesServiceParams) => {
  if (!user || user.role !== 'admin') {
    throw new AppError(
      'Acesso negado. Apenas administradores podem visualizar empresas.',
      403
    );
  }

  return Company.find({}, '_id name cnpj');
};
