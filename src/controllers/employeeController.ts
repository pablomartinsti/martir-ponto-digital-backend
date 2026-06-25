import { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { Absence } from '../models/Absence';
import { Company } from '../models/Company';
import { Employee } from '../models/Employee';
import { TimeRecord } from '../models/TimeRecord';
import { WorkSchedule } from '../models/WorkSchedule';
import { env } from '../config/env';
import { AuthenticatedRequest } from '../types/auth';
import {
  employeeSchema,
  filterEmployeesSchema,
  loginSchema,
  toggleStatusSchema,
} from '../utils/validationSchemas';

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'A nova senha deve ter no minimo 8 caracteres.'),
});

const companyIdSchema = z.string().nonempty('companyId e obrigatorio.');

const serializeEmployee = (employee: unknown) => {
  const source =
    employee && typeof (employee as { toObject?: unknown }).toObject === 'function'
      ? (employee as { toObject: () => Record<string, unknown> }).toObject()
      : (employee as Record<string, unknown>);

  const { password, ...safeEmployee } = source;
  return safeEmployee;
};

export const createEmployee = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      res.status(401).json({ error: 'Usuario nao autenticado.' });
      return;
    }

    const validatedData = employeeSchema.parse(req.body);

    let companyId: string | undefined;

    if (requester.role === 'admin') {
      companyId = companyIdSchema.parse(req.body.companyId);
      const company = await Company.findById(companyId);
      if (!company) {
        res.status(404).json({ error: 'Empresa nao encontrada.' });
        return;
      }
    } else if (requester.role === 'sub_admin') {
      companyId = requester.companyId;
      if (!companyId) {
        res.status(400).json({ error: 'Sub admin sem empresa vinculada.' });
        return;
      }
    } else {
      res.status(403).json({ error: 'Permissao negada.' });
      return;
    }

    const existing = await Employee.findOne({ cpf: validatedData.cpf });
    if (existing) {
      res.status(400).json({ error: 'CPF ja cadastrado.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const employee = new Employee({
      ...validatedData,
      password: hashedPassword,
      companyId,
    });

    await employee.save();

    res.status(201).json(serializeEmployee(employee));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro ao criar funcionario:', error);
      res.status(500).json({ error: 'Erro ao criar funcionario.' });
    }
  }
};

export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      res.status(401).json({ error: 'Usuario nao autenticado.' });
      return;
    }

    if (requester.role !== 'admin' && requester.role !== 'sub_admin') {
      res
        .status(403)
        .json({ error: 'Apenas admin ou sub admin podem redefinir senhas.' });
      return;
    }

    const { id } = req.params;
    const { newPassword } = resetPasswordSchema.parse(req.body);
    const user = await Employee.findById(id).select('+password');

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado.' });
      return;
    }

    if (requester.role === 'sub_admin') {
      const isSameCompany = String(user.companyId) === requester.companyId;
      if (!isSameCompany || user.role !== 'employee') {
        res.status(403).json({
          error:
            'Sub admin so pode redefinir senha de funcionarios da propria empresa.',
        });
        return;
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: 'Senha redefinida com sucesso.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }

    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
};

export const login = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const employee = await Employee.findOne({
      cpf: validatedData.cpf,
    }).select('+password');

    if (!employee) {
      res.status(404).json({ error: 'Funcionario nao encontrado' });
      return;
    }

    if (!employee.isActive) {
      res.status(403).json({ error: 'Funcionario desativado. Acesso negado.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      employee.password
    );

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Senha invalida' });
      return;
    }

    const company = employee.companyId
      ? await Company.findById(employee.companyId)
      : null;

    const token = jwt.sign(
      {
        id: String(employee._id),
        name: employee.name,
        role: employee.role,
        companyId: employee.companyId ? String(employee.companyId) : undefined,
        companyName: company?.name || '',
      },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      token,
      user: {
        id: employee._id,
        name: employee.name,
        role: employee.role,
        companyId: employee.companyId,
        companyName: company?.name || '',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }

    console.error('Erro ao realizar login:', error);
    res.status(500).json({ error: 'Erro ao realizar login.' });
  }
};

export const getEmployees = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const requester = req.user;

    if (!requester) {
      res.status(401).json({ error: 'Usuario nao autenticado.' });
      return;
    }

    const { filter } = filterEmployeesSchema.parse(req.query);
    const query: Record<string, unknown> = {};

    if (filter === 'active') {
      query.isActive = true;
    } else if (filter === 'inactive') {
      query.isActive = false;
    }

    if (requester.role === 'sub_admin') {
      query.companyId = requester.companyId;
    }

    if (requester.role === 'admin' && req.query.cnpj) {
      const company = await Company.findOne({ cnpj: req.query.cnpj });

      if (!company) {
        res
          .status(404)
          .json({ error: 'Empresa nao encontrada com este CNPJ.' });
        return;
      }

      query.companyId = company._id;
    }

    const employees = await Employee.find(query).populate(
      'companyId',
      'name cnpj'
    );

    res.status(200).json(employees);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }

    console.error('Erro ao listar funcionarios:', error);
    res.status(500).json({ error: 'Erro ao listar funcionarios.' });
  }
};

export const toggleEmployeeStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const requester = req.user;

    if (!requester) {
      res.status(401).json({ error: 'Usuario nao autenticado.' });
      return;
    }

    const { id } = req.params;
    const { isActive } = toggleStatusSchema.parse(req.body);
    const employee = await Employee.findById(id);

    if (!employee) {
      res.status(404).json({ error: 'Funcionario nao encontrado.' });
      return;
    }

    if (requester.role === 'sub_admin') {
      const isSameCompany = String(employee.companyId) === requester.companyId;
      if (!isSameCompany || employee.role !== 'employee') {
        res.status(403).json({
          error:
            'Permissao negada para alterar usuarios fora da sua empresa ou com perfil administrativo.',
        });
        return;
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (updatedEmployee?.role === 'sub_admin' && isActive === false) {
      await Employee.updateMany(
        { companyId: updatedEmployee.companyId, role: 'employee' },
        { isActive: false }
      );
    }

    res.status(200).json({
      message: `Status do funcionario atualizado para ${
        isActive ? 'ativo' : 'inativo'
      }`,
      employee: updatedEmployee,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }

    console.error('Erro ao atualizar status do funcionario:', error);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
};

const deleteSubAdminSchema = z.object({
  id: z.string().nonempty('ID e obrigatorio'),
});

export const deleteSubAdminAndEmployees = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = deleteSubAdminSchema.parse(req.params);

    const subAdmin = await Employee.findById(id);
    if (!subAdmin || subAdmin.role !== 'sub_admin') {
      res.status(404).json({ error: 'Sub admin nao encontrado.' });
      return;
    }

    const companyId = subAdmin.companyId;
    const employees = await Employee.find({ companyId, role: 'employee' });
    const employeeIds = employees.map((emp) => emp._id);

    await WorkSchedule.deleteMany({ employeeId: { $in: employeeIds } });
    await TimeRecord.deleteMany({ employeeId: { $in: employeeIds } });
    await Absence.deleteMany({ employeeId: { $in: employeeIds } });
    await Employee.deleteMany({ _id: { $in: employeeIds } });
    await Employee.findByIdAndDelete(id);

    const stillHasSubAdmins = await Employee.exists({
      companyId,
      role: 'sub_admin',
    });

    if (!stillHasSubAdmins) {
      await Company.findByIdAndDelete(companyId);
    }

    res.status(200).json({
      message:
        'Sub admin, funcionarios e dados associados foram excluidos com sucesso.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
      return;
    }

    console.error('Erro ao excluir sub admin:', error);
    res.status(500).json({ error: 'Erro interno ao excluir sub admin.' });
  }
};
