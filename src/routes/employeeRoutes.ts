import express from "express";
import {
  createEmployee,
  getEmployees,
  toggleEmployeeStatus,
} from "../controllers/employeeController";

const router = express.Router();

// Define as rotas e delega para os controladores
router.post("/employees", createEmployee);
router.get("/employees", getEmployees);
router.patch("/:id/status", toggleEmployeeStatus);

export default router;
