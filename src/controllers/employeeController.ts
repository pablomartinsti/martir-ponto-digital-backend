import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Employee } from '../models/Employee';
import { WorkSchedule } from '../models/WorkSchedule';
import { TimeRecord } from '../models/TimeRecord';

import {
  employeeSchema,
  filterEmployeesSchema,
  loginSchema,
  toggleStatusSchema,
} from '../utils/validationSchemas';
import { z } from 'zod';
import { Company } from '../models/Company';

const SECRET_KEY = process.env.JWT_SECRET!;

interface CustomUser {
  id: string;
  role: 'admin' | 'sub_admin' | 'employee';
  companyId?: string;
}

// Cria novo funcionário (apenas admin ou sub_admin)
export const createEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validatedData = employeeSchema.parse(req.body);

    const requester = (req as Request & { user?: CustomUser }).user;

    let companyId;

    if (requester?.role === 'admin') {
      companyId = (req.body as any).companyId;
      if (!companyId) {
        res
          .status(400)
          .json({ error: 'O campo companyId é obrigatório para admin.' });
      }
    } else if (requester?.role === 'sub_admin') {
      companyId = requester.companyId;
    } else {
      res.status(403).json({ error: 'Permissão negada.' });
    }

    const existing = await Employee.findOne({ cpf: validatedData.cpf });
    if (existing) {
      res.status(400).json({ error: 'CPF já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const employee = new Employee({
      ...validatedData,
      password: hashedPassword,
      companyId,
    });

    await employee.save();

    res.status(201).json(employee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro ao criar funcionário:', error);
      res.status(500).json({ error: 'Erro ao criar funcionário.' });
    }
  }
};

// Login de funcionário com validação de senha e geração de token
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const employee = await Employee.findOne({ cpf: validatedData.cpf });
    if (!employee) {
      res.status(404).json({ error: 'Funcionário não encontrado' });
      return; // 👈 Faltava esse aqui
    }

    // ✅ Bloqueia login de funcionário inativo
    if (!employee.isActive) {
      res.status(403).json({ error: 'Funcionário desativado. Acesso negado.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      employee.password
    );

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Senha inválida' });
      return;
    }

    const token = jwt.sign(
      {
        id: employee._id,
        role: employee.role,
        companyId: employee.companyId,
      },
      SECRET_KEY,
      { expiresIn: '1m' }
    );

    res.status(200).json({
      token,
      user: {
        id: employee._id,
        name: employee.name,
        role: employee.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }

    console.error('Erro ao realizar login:', error);
    res.status(500).json({ error: 'Erro ao realizar login.' });
    return;
  }
};

// Listar funcionários com filtros por status e CNPJ (admin/sub_admin)
export const getEmployees = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const requester = (req as Request & { user?: CustomUser }).user;

    if (!requester) {
      res.status(401).json({ error: 'Usuário não autenticado.' });
      return; // 👈 importante!
    }

    const { filter } = filterEmployeesSchema.parse(req.query);

    const query: any = {};

    // Filtro por status
    if (filter === 'active') {
      query.isActive = true;
    } else if (filter === 'inactive') {
      query.isActive = false;
    }

    // Sub admin só vê funcionários da sua empresa
    if (requester.role === 'sub_admin') {
      query.companyId = requester.companyId;
    }

    // Admin pode filtrar por cnpj
    if (requester.role === 'admin' && req.query.cnpj) {
      const { Company } = await import('../models/Company');
      const company = await Company.findOne({ cnpj: req.query.cnpj });

      if (!company) {
        res
          .status(404)
          .json({ error: 'Empresa não encontrada com este CNPJ.' });
        return; // 👈 aqui também!
      }

      query.companyId = company._id;
    }

    const employees = await Employee.find(query, { password: 0 }).populate(
      'companyId',
      'name cnpj'
    );

    res.status(200).json(employees);
    return; // 👈 opcional, mas ajuda a clareza
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }

    console.error('Erro ao listar funcionários:', error);
    res.status(500).json({ error: 'Erro ao listar funcionários.' });
    return;
  }
};
// Ativa ou inativa um funcionário e todos os subordinados caso seja sub_admin
export const toggleEmployeeStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const requester = (req as Request & { user?: CustomUser }).user;

    if (!requester) {
      res.status(401).json({ error: 'Usuário não autenticado.' });
      return;
    }

    const { id } = req.params;
    const { isActive } = toggleStatusSchema.parse(req.body);

    const employee = await Employee.findById(id);

    if (!employee) {
      res.status(404).json({ error: 'Funcionário não encontrado.' });
      return;
    }

    // 🔐 sub_admin só pode mudar status de funcionários da própria empresa
    if (
      requester.role === 'sub_admin' &&
      String(employee.companyId) !== requester.companyId
    ) {
      res.status(403).json({
        error: 'Permissão negada para alterar funcionários de outra empresa.',
      });
      return;
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    // ✅ Se o funcionário for um sub_admin sendo desativado, desativa todos da empresa dele
    if (updatedEmployee?.role === 'sub_admin' && isActive === false) {
      await Employee.updateMany(
        { companyId: updatedEmployee.companyId, role: 'employee' },
        { isActive: false }
      );
    }

    res.status(200).json({
      message: `Status do funcionário atualizado para ${
        isActive ? 'ativo' : 'inativo'
      }`,
      employee: updatedEmployee,
    });
    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    } else {
      console.error('Erro ao atualizar status do funcionário:', error);
      res.status(500).json({ error: 'Erro ao atualizar status.' });
      return;
    }
  }
};

const deleteSubAdminSchema = z.object({
  id: z.string().nonempty('ID é obrigatório'),
});

// Exclui sub_admin, todos os funcionários da empresa e a empresa se necessário
export const deleteSubAdminAndEmployees = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = deleteSubAdminSchema.parse(req.params);

    const subAdmin = await Employee.findById(id);
    if (!subAdmin || subAdmin.role !== 'sub_admin') {
      res.status(404).json({ error: 'Sub admin não encontrado.' });
      return;
    }

    const companyId = subAdmin.companyId;

    // Busca e remove funcionários da empresa
    const employees = await Employee.find({ companyId, role: 'employee' });
    const employeeIds = employees.map((emp) => emp._id);

    await WorkSchedule.deleteMany({ employeeId: { $in: employeeIds } });
    await TimeRecord.deleteMany({ employeeId: { $in: employeeIds } });
    await Employee.deleteMany({ _id: { $in: employeeIds } });

    // Remove o sub admin
    await Employee.findByIdAndDelete(id);

    // Verifica se ainda há algum sub_admin vinculado à empresa
    const stillHasSubAdmins = await Employee.exists({
      companyId,
      role: 'sub_admin',
    });

    if (!stillHasSubAdmins) {
      await Company.findByIdAndDelete(companyId);
    }

    res.status(200).json({
      message:
        'Sub admin, funcionários e dados associados foram excluídos com sucesso. Empresa também excluída se não havia outro sub admin.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro ao excluir sub admin:', error);
      res.status(500).json({ error: 'Erro interno ao excluir sub admin.' });
    }
  }
};
