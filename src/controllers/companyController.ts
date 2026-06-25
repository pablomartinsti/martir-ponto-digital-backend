import { Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { Company } from '../models/Company';
import { Employee } from '../models/Employee';
import { AuthenticatedRequest } from '../types/auth';

const createSubAdminSchema = z.object({
  name: z.string().min(1, 'O nome e obrigatorio.'),
  cpf: z.string().length(11, 'O CPF deve ter 11 caracteres.'),
  password: z.string().min(8, 'A senha deve ter no minimo 8 caracteres.'),
  companyName: z.string().min(1, 'O nome da empresa e obrigatorio.'),
  cnpj: z.string().length(14, 'O CNPJ deve ter 14 caracteres.'),
  position: z.string().min(1, 'O cargo e obrigatorio.'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const createSubAdmin = async (
  req: AuthenticatedRequest,
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
      res.status(400).json({ error: 'Empresa ja cadastrada com este CNPJ.' });
      return;
    }

    const existingUser = await Employee.findOne({ cpf });
    if (existingUser) {
      res.status(400).json({ error: 'CPF ja esta em uso.' });
      return;
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }

    console.error('Erro ao criar sub admin:', error);
    res.status(500).json({ error: 'Erro ao criar sub admin.' });
  }
};

export const getAllCompanies = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user || user.role !== 'admin') {
      res.status(403).json({
        error: 'Acesso negado. Apenas administradores podem visualizar empresas.',
      });
      return;
    }

    const companies = await Company.find({}, '_id name cnpj');
    res.status(200).json(companies);
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.status(500).json({ error: 'Erro ao buscar empresas.' });
  }
};
