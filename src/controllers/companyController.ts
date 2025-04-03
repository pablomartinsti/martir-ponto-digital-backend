import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Company } from '../models/Company';
import { Employee } from '../models/Employee';
import { z } from 'zod';

const createSubAdminSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  cpf: z.string().length(11, 'O CPF deve ter 11 caracteres.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  companyName: z.string().min(1, 'O nome da empresa é obrigatório.'),
  cnpj: z.string().length(14, 'O CNPJ deve ter 14 caracteres.'),
  position: z.string().min(1, 'O cargo é obrigatório.'),
  latitude: z.number(), // 👈 novo campo
  longitude: z.number(), // 👈 novo campo
});

interface CustomUser {
  id: string;
  role: 'admin' | 'sub_admin' | 'employee';
  companyId?: string;
}

interface AuthenticatedRequest extends Request {
  user?: CustomUser;
}

export const createSubAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validatedData = createSubAdminSchema.parse(req.body);

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
      res.status(400).json({ error: 'Empresa já cadastrada com este CNPJ.' });
      return;
    }

    const existingUser = await Employee.findOne({ cpf });
    if (existingUser) {
      res.status(400).json({ error: 'CPF já está em uso.' });
      return;
    }

    const company = new Company({
      name: companyName,
      cnpj,
      latitude, // 👈 agora vai!
      longitude, // 👈 também
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

    res.status(201).json({
      message: 'Sub admin e empresa cadastrados com sucesso.',
      subAdmin: {
        id: subAdmin._id,
        name: subAdmin.name,
        cpf: subAdmin.cpf,
        role: subAdmin.role,
        companyId: subAdmin.companyId,
      },
    });
    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro ao criar sub admin:', error);
      res.status(500).json({ error: 'Erro ao criar sub admin.' });
    }
  }
};

export const getAllCompanies = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user as CustomUser;

    if (user.role !== 'admin') {
      return res.status(403).json({
        error:
          'Acesso negado. Apenas administradores podem visualizar as empresas.',
      });
    }

    // ✅ Inclui o cnpj no retorno
    const companies = await Company.find({}, '_id name cnpj');
    return res.status(200).json(companies);
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    return res.status(500).json({ error: 'Erro ao buscar empresas.' });
  }
};
