import bcrypt from 'bcrypt';
import { createSubAdminSchema } from '../../dtos/company/companySchemas';
import { AppError } from '../../errors/AppError';
import { Company } from '../../models/Company';
import { Employee } from '../../models/Employee';

interface CreateSubAdminServiceParams {
  body: unknown;
}

export const createSubAdminService = async ({
  body,
}: CreateSubAdminServiceParams) => {
  const validatedData = createSubAdminSchema.parse(body);
  const {
    name,
    cpf,
    password,
    companyName,
    cnpj,
    position,
    latitude,
    longitude,
  } = validatedData;

  const existingCompany = await Company.findOne({ cnpj });
  if (existingCompany) {
    throw new AppError('Empresa ja cadastrada com este CNPJ.', 400);
  }

  const existingUser = await Employee.findOne({ cpf });
  if (existingUser) {
    throw new AppError('CPF ja esta em uso.', 400);
  }

  const company = new Company({
    name: companyName,
    cnpj,
    latitude,
    longitude,
  });

  await company.save();

  const hashedPassword = await bcrypt.hash(password, 10);
  const subAdmin = new Employee({
    name,
    cpf,
    password: hashedPassword,
    isActive: true,
    role: 'sub_admin',
    companyId: company._id,
    position,
  });

  await subAdmin.save();

  return {
    message: 'Sub admin e empresa cadastrados com sucesso.',
    subAdmin: {
      id: subAdmin._id,
      name: subAdmin.name,
      cpf: subAdmin.cpf,
      role: subAdmin.role,
      companyId: subAdmin.companyId,
    },
  };
};
