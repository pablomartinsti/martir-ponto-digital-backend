import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Employee } from "../models/Employee";
import { WorkSchedule } from "../models/WorkSchedule";
import { TimeRecord } from "../models/TimeRecord";
import {
  handleError,
  sendErrorResponse,
  validateField,
} from "../utils/errorHandler";

const SECRET_KEY = "sua_chave_secreta"; // Substitua por uma chave segura

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cpf, password } = req.body;
    const employee = await Employee.findOne({ cpf });

    if (!employee)
      return sendErrorResponse(res, 404, "Funcionário não encontrado");

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) return sendErrorResponse(res, 401, "Senha inválida");

    const token = jwt.sign(
      { id: employee._id, role: employee.role },
      SECRET_KEY,
      {
        expiresIn: "1y",
      }
    );

    res.status(200).json({ token });
  } catch (error) {
    sendErrorResponse(res, 500, handleError(error));
  }
};

export const createEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, position, cpf, password } = req.body;

    const employee = new Employee({
      name,
      position,
      cpf,
      password,
      isActive: true,
    });

    await employee.save();
    res.status(201).json(employee);
  } catch (error) {
    sendErrorResponse(res, 400, handleError(error));
  }
};

// Controlador para listar funcionários
export const getEmployees = async (req: Request, res: Response) => {
  try {
    const { filter } = req.query;

    let query = {};

    if (filter === "active") {
      query = { isActive: true };
    } else if (filter === "inactive") {
      query = { isActive: false };
    }

    console.log("Filtro aplicado:", query);

    const employees = await Employee.find(query, { password: 0 });
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ error: handleError(error) });
  }
};

export const toggleEmployeeStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    validateField(isActive, "boolean", "O campo isActive deve ser um booleano");

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!updatedEmployee)
      return sendErrorResponse(res, 404, "Funcionário não encontrado");

    res.status(200).json({
      message: `Status do funcionário atualizado para ${
        isActive ? "ativo" : "inativo"
      }`,
      employee: updatedEmployee,
    });
  } catch (error) {
    sendErrorResponse(res, 500, handleError(error));
  }
};

export const deleteEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar se o funcionário existe
    const employee = await Employee.findById(id);
    if (!employee) {
      res.status(404).json({ error: "Funcionário não encontrado" });
      return;
    }

    // Excluir as escalas associadas ao funcionário
    await WorkSchedule.deleteMany({ employeeId: id });

    // Excluir os registros de ponto associados ao funcionário
    await TimeRecord.deleteMany({ employeeId: id });

    // Excluir o funcionário
    await Employee.findByIdAndDelete(id);

    res.status(200).json({
      message: "Funcionário e registros associados excluídos com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir funcionário:", error);
    res
      .status(500)
      .json({ error: "Erro ao excluir funcionário e seus registros" });
  }
};
