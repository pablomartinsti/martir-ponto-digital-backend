import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Employee } from '../models/Employee';
import { WorkSchedule } from '../models/WorkSchedule';
import { TimeRecord } from '../models/TimeRecord';

import {
  deleteEmployeeSchema,
  employeeSchema,
  filterEmployeesSchema,
  loginSchema,
  toggleStatusSchema,
} from '../utils/validationSchemas';
import { z } from 'zod';

const SECRET_KEY = process.env.JWT_SECRET!;

interface CustomUser {
  id: string;
  role: 'admin' | 'sub_admin' | 'employee';
  companyId?: string;
}

export const createEmployee = async (req: Request, res: Response) => {
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
        return;
      }
    } else if (requester?.role === 'sub_admin') {
      companyId = requester.companyId;
    } else {
      res.status(403).json({ error: 'Permissão negada.' });
      return;
    }

    const existing = await Employee.findOne({ cpf: validatedData.cpf });
    if (existing) {
      res.status(400).json({ error: 'CPF já cadastrado.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const employee = new Employee({
      ...validatedData,
      password: hashedPassword,
      companyId,
    });

    await employee.save();

    res.status(201).json(employee);
    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    } else {
      console.error('Erro ao criar funcionário:', error);
      res.status(500).json({ error: 'Erro ao criar funcionário.' });
      return;
    }
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const employee = await Employee.findOne({ cpf: validatedData.cpf });
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    // ✅ Bloqueia login de funcionário inativo
    if (!employee.isActive) {
      return res
        .status(403)
        .json({ error: 'Funcionário desativado. Acesso negado.' });
    }

    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      employee.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Senha inválida' });
    }

    const token = jwt.sign(
      {
        id: employee._id,
        role: employee.role,
        companyId: employee.companyId,
      },
      SECRET_KEY,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: employee._id,
        name: employee.name,
        role: employee.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }

    console.error('Erro ao realizar login:', error);
    return res.status(500).json({ error: 'Erro ao realizar login.' });
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const requester = (req as Request & { user?: CustomUser }).user;

    if (!requester) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
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
        return res
          .status(404)
          .json({ error: 'Empresa não encontrada com este CNPJ.' });
      }

      query.companyId = company._id;
    }

    const employees = await Employee.find(query, { password: 0 }).populate(
      'companyId',
      'name cnpj'
    );

    return res.status(200).json(employees);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }

    console.error('Erro ao listar funcionários:', error);
    return res.status(500).json({ error: 'Erro ao listar funcionários.' });
  }
};

export const toggleEmployeeStatus = async (req: Request, res: Response) => {
  try {
    const requester = (req as Request & { user?: CustomUser }).user;

    if (!requester) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    const { id } = req.params;
    const { isActive } = toggleStatusSchema.parse(req.body);

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    // 🔐 sub_admin só pode mudar status de funcionários da própria empresa
    if (
      requester.role === 'sub_admin' &&
      String(employee.companyId) !== requester.companyId
    ) {
      return res.status(403).json({
        error: 'Permissão negada para alterar funcionários de outra empresa.',
      });
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

    return res.status(200).json({
      message: `Status do funcionário atualizado para ${
        isActive ? 'ativo' : 'inativo'
      }`,
      employee: updatedEmployee,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro ao atualizar status do funcionário:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status.' });
    }
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = deleteEmployeeSchema.parse(req.params);

    const employee = await Employee.findById(id);
    if (!employee) {
      res.status(404).json({ error: 'Funcionário não encontrado' });
      return;
    }

    await WorkSchedule.deleteMany({ employeeId: id });
    await TimeRecord.deleteMany({ employeeId: id });
    await Employee.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Funcionário e registros associados excluídos com sucesso',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro ao excluir funcionário:', error);
      res.status(500).json({ error: 'Erro ao excluir funcionário.' });
    }
  }
};
