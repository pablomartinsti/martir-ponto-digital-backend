import { query, Request, Response } from "express";
import { Employee } from "../models/Employee";
import { handleError } from "../utils/errorHandler";
import { error } from "console";

// Controlador para criar um funcionário
export const createEmployee = async (req: Request, res: Response) => {
  try {
    const { name, position, cpf, password } = req.body;

    const employee = new Employee({
      name,
      position,
      cpf,
      password,
      isActive: true,
    });
    console.log(employee);
    await employee.save();

    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ error: handleError(error) });
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

export const toggleEmployeeStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res.status(400).json({ error: "O campo isActive deve ser um booleano" });
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!updatedEmployee) {
      res.status(404).json({ error: "funcionário não encontrado" });
    }

    res.status(200).json({
      message: `Status do funcionário atualizado com sucesso para ${
        isActive ? "ativo" : "inativo"
      }`,
      employee: updatedEmployee,
    });
  } catch (error) {
    res.status(500).json({ error: handleError(error) });
  }
};
