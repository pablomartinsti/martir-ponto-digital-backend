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

const SECRET_KEY = 'sua_chave_secreta'; // Substitua por uma chave segura

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const validatedData = employeeSchema.parse(req.body);

    // Hash da senha no controlador
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const employee = new Employee({
      ...validatedData,
      password: hashedPassword, // Salvar a senha hash
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

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const employee = await Employee.findOne({ cpf: validatedData.cpf });
    if (!employee) {
      res.status(404).json({ error: 'Funcionário não encontrado' });
      return;
    }

    console.log('Senha informada:', validatedData.password);
    console.log('Hash salvo no banco:', employee.password);

    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      employee.password
    );
    console.log('Resultado da comparação:', isPasswordValid);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Senha inválida' });
      return;
    }

    const token = jwt.sign(
      { id: employee._id, role: employee.role },
      SECRET_KEY,
      {
        expiresIn: '1d',
      }
    );

    res.status(200).json({ token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro ao realizar login:', error);
      res.status(500).json({ error: 'Erro ao realizar login.' });
    }
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const { filter } = filterEmployeesSchema.parse(req.query);

    let query = {};
    if (filter === 'active') {
      query = { isActive: true };
    } else if (filter === 'inactive') {
      query = { isActive: false };
    }

    const employees = await Employee.find(query, { password: 0 });
    res.status(200).json(employees);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro ao listar funcionários:', error);
      res.status(500).json({ error: 'Erro ao listar funcionários.' });
    }
  }
};

export const toggleEmployeeStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = toggleStatusSchema.parse(req.body);

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!updatedEmployee)
      res.status(404).json({ error: 'Funcionário não encontrado' });

    res.status(200).json({
      message: `Status do funcionário atualizado para ${
        isActive ? 'ativo' : 'inativo'
      }`,
      employee: updatedEmployee,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error('Erro ao atualizar status do funcionário:', error);
      res.status(500).json({ error: 'Erro ao atualizar status.' });
    }
  }
};

export const deleteEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
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
